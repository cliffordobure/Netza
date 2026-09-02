import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function CatalogMeta({ type }) {
  const [rows, setRows] = useState([]);
  const title = type === "brands" ? "Brands" : "Categories";

  useEffect(() => {
    api("/admin/categories").then((d) => setRows(type === "brands" ? d.brands : d.categories));
  }, [type]);

  return (
    <div className="prod">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/products">Products</Link>
        <span>›</span>
        <strong>{title}</strong>
      </nav>
      <div className="prod-head">
        <div>
          <h1>{title}</h1>
          <p>Catalog {title.toLowerCase()} used across the Tajira Kenya store.</p>
        </div>
        <Link className="btn btn-purple btn-small" style={{ width: "auto", marginTop: 0 }} to="/products">
          All Products
        </Link>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong></td>
                <td className="muted">{r.slug}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
