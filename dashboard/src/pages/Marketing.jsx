import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MarketingOverview from "./MarketingOverview";
import MarketingCampaigns from "./MarketingCampaigns";
import MarketingEmail from "./MarketingEmail";
import MarketingSms from "./MarketingSms";
import MarketingPush from "./MarketingPush";
import MarketingDiscounts from "./MarketingDiscounts";
import MarketingBanners from "./MarketingBanners";

export default function Marketing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";

  useEffect(() => {
    if (!searchParams.get("tab") && searchParams.toString()) {
      // keep overview when only other params present
    }
  }, [searchParams, navigate]);

  if (tab === "campaigns") return <MarketingCampaigns />;
  if (tab === "email") return <MarketingEmail />;
  if (tab === "sms") return <MarketingSms />;
  if (tab === "push") return <MarketingPush />;
  if (tab === "discounts") return <MarketingDiscounts />;
  if (tab === "banners") return <MarketingBanners />;
  return <MarketingOverview />;
}
