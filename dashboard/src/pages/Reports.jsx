import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import DeliveryReports from "./DeliveryReports";
import SalesReports from "./SalesReports";

export default function Reports() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "delivery";

  useEffect(() => {
    if (!searchParams.get("tab")) {
      navigate("/reports?tab=delivery", { replace: true });
    }
  }, [searchParams, navigate]);

  if (tab === "delivery") {
    return <DeliveryReports />;
  }

  if (tab === "sales") {
    return <SalesReports />;
  }

  const titles = {
    sales: "Sales Reports",
    orders: "Order Reports",
    customers: "Customer Reports",
    inventory: "Inventory Reports",
    delivery: "Delivery Reports",
  };

  return (
    <div className="dlvrpt-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/reports?tab=delivery">Reports</Link>
        <span>›</span>
        <strong>{titles[tab] || "Reports"}</strong>
      </nav>
      <div className="prod-head">
        <div>
          <h1>{titles[tab] || "Reports"}</h1>
          <p>This report section is ready for detailed analytics.</p>
        </div>
        <button className="btn btn-purple btn-small" type="button" onClick={() => navigate("/reports?tab=delivery")}>
          Back to Delivery Reports
        </button>
      </div>
    </div>
  );
}
