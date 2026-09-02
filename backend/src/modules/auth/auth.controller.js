const { z } = require("zod");
const bcrypt = require("bcryptjs");
const { User, RefreshToken, Cart } = require("../../models");
const { signAccess, signRefresh, hashToken, verifyRefresh, publicUser } = require("../../lib/jwt");
const { randomCode, nairobiDateString } = require("../../lib/utils");
const { creditPoints, getRule } = require("../../services/points.service");
const { asyncHandler, httpError } = require("../../middleware/error");
const {
  normalizeEmail,
  normalizePhone,
  phoneLookupVariants,
  emailMatchFilter,
} = require("../../lib/identity");

const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(9),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  password: z.string().min(6),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
});

async function issueTokens(user) {
  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user);
  const decoded = verifyRefresh(refreshToken);
  await RefreshToken.create({
    tokenHash: hashToken(refreshToken),
    user: user._id,
    expiresAt: new Date(decoded.exp * 1000),
  });
  return { user: publicUser(user), accessToken, refreshToken };
}

async function maybeDailyLogin(user) {
  const today = nairobiDateString();
  if (user.lastLoginDate === today) {
    return { awarded: false, streak: user.loginStreak, points: 0 };
  }
  const yesterday = nairobiDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const streak = user.lastLoginDate === yesterday ? user.loginStreak + 1 : 1;
  user.lastLoginDate = today;
  user.loginStreak = streak;
  user.lastLoginAt = new Date();
  await user.save();
  const daily = await getRule("DAILY_LOGIN");
  let points = 0;
  if (daily) {
    await creditPoints(user._id, "DAILY_LOGIN", daily.points, "Daily login", today);
    points += daily.points;
  }
  if (streak > 0 && streak % 7 === 0) {
    const bonus = await getRule("STREAK_7");
    if (bonus) {
      await creditPoints(user._id, "STREAK_BONUS", bonus.points, "7-day streak bonus", today);
      points += bonus.points;
    }
  }
  return { awarded: true, streak, points };
}

/** Return all candidate users for an identifier (handles legacy email casing / phone formats). */
async function findCandidates(identifier) {
  const raw = String(identifier || "").trim();
  if (!raw) return [];

  if (raw.includes("@")) {
    const filter = emailMatchFilter(raw);
    if (!filter) return [];
    return User.find(filter).sort({ createdAt: 1 });
  }

  const phones = phoneLookupVariants(raw);
  if (!phones.length) return [];
  return User.find({ phone: { $in: phones } }).sort({ createdAt: 1 });
}

exports.register = asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body);

  let phone;
  try {
    phone = normalizePhone(body.phone);
  } catch (e) {
    throw httpError(e.status || 400, e.message || "Invalid phone");
  }

  const email = normalizeEmail(body.email);

  const phoneTaken = await User.findOne({ phone: { $in: phoneLookupVariants(phone) } });
  if (phoneTaken) {
    throw httpError(409, "This phone number is already registered. Sign in instead.");
  }

  if (email) {
    const emailTaken = await User.findOne(emailMatchFilter(email));
    if (emailTaken) {
      throw httpError(409, "This email is already registered. Sign in instead.");
    }
  }

  let referredBy = null;
  if (body.referralCode) {
    const referrer = await User.findOne({ referralCode: body.referralCode.toUpperCase() });
    if (referrer) referredBy = referrer._id;
  }

  const user = await User.create({
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    phone,
    email: email || undefined,
    passwordHash: await bcrypt.hash(body.password, 10),
    referralCode: randomCode("TAJIRA"),
    referredBy,
  });
  await Cart.create({ user: user._id, items: [] });

  const welcome = await getRule("WELCOME");
  if (welcome) {
    await creditPoints(user._id, "WELCOME", welcome.points, "Welcome to Tajira Kenya");
  }
  if (referredBy) {
    const refRule = await getRule("REFERRAL");
    if (refRule) {
      await creditPoints(referredBy, "REFERRAL", refRule.points, "Referral reward", user.id);
    }
  }

  res.status(201).json(await issueTokens(user));
});

exports.login = asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const candidates = await findCandidates(body.identifier);
  if (!candidates.length) throw httpError(401, "Wrong phone/email or password");

  let user = null;
  for (const candidate of candidates) {
    if (!candidate.isActive) continue;
    const ok = await bcrypt.compare(body.password, candidate.passwordHash);
    if (ok) {
      user = candidate;
      break;
    }
  }
  if (!user) throw httpError(401, "Wrong phone/email or password");

  // Heal legacy rows so future logins stay consistent
  let healed = false;
  const email = user.email ? normalizeEmail(user.email) : "";
  if (user.email && email !== user.email) {
    user.email = email;
    healed = true;
  }
  try {
    const phone = normalizePhone(user.phone);
    if (phone !== user.phone) {
      user.phone = phone;
      healed = true;
    }
  } catch {
    /* keep legacy phone if it cannot normalize */
  }
  if (healed) await user.save().catch(() => {});

  const daily = await maybeDailyLogin(user);
  res.json({ ...(await issueTokens(user)), dailyLogin: daily });
});

exports.refresh = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken;
  if (!token) throw httpError(400, "refreshToken is required");
  let payload;
  try {
    payload = verifyRefresh(token);
  } catch {
    throw httpError(401, "Invalid refresh token");
  }

  // Atomic consume — only one refresh wins; issue new tokens before removing old row
  const record = await RefreshToken.findOne({ tokenHash: hashToken(token) });
  if (!record) throw httpError(401, "Session expired. Please sign in again.");

  const user = await User.findById(record.user);
  if (!user || !user.isActive) throw httpError(401, "Invalid session");

  const tokens = await issueTokens(user);
  await RefreshToken.deleteOne({ _id: record._id });
  res.json(tokens);
});

exports.logout = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken;
  if (token) await RefreshToken.deleteMany({ tokenHash: hashToken(token) });
  res.json({ ok: true });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user), pointsBalance: req.user.pointsBalance || 0 });
});

exports.completeProfile = asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.string().email().optional(),
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
  });
  const body = schema.parse(req.body);
  if (body.email) {
    const email = normalizeEmail(body.email);
    const taken = await User.findOne({ ...emailMatchFilter(email), _id: { $ne: req.user._id } });
    if (taken) throw httpError(409, "This email is already registered");
    req.user.email = email;
  }
  if (body.firstName) req.user.firstName = body.firstName.trim();
  if (body.lastName) req.user.lastName = body.lastName.trim();
  const wasComplete = req.user.profileCompleted;
  req.user.profileCompleted = true;
  await req.user.save();
  if (!wasComplete) {
    const rule = await getRule("COMPLETE_PROFILE");
    if (rule) await creditPoints(req.user._id, "COMPLETE_PROFILE", rule.points, "Profile completed");
  }
  res.json({ user: publicUser(req.user) });
});

exports.dailyLogin = asyncHandler(async (req, res) => {
  res.json(await maybeDailyLogin(req.user));
});

/** One-shot heal for existing accounts (email casing + phone format + duplicate emails). */
exports.normalizeIdentities = async function normalizeIdentities() {
  const users = await User.find({}).sort({ createdAt: 1 });
  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      let changed = false;

      if (user.email) {
        const email = normalizeEmail(user.email);
        if (!email) {
          user.email = undefined;
          changed = true;
        } else if (email !== user.email) {
          user.email = email;
          changed = true;
        }
      }

      if (user.phone) {
        let phone;
        try {
          phone = normalizePhone(user.phone);
        } catch {
          skipped += 1;
          if (changed) await user.save();
          continue;
        }
        if (phone !== user.phone) {
          user.phone = phone;
          changed = true;
        }
      }

      if (changed) {
        await user.save();
        updated += 1;
      }
    } catch {
      skipped += 1;
    }
  }
  return { updated, skipped, total: users.length };
};
