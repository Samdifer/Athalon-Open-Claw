"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ShopLocationsRedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/settings/station-config", { replace: true });
  }, [navigate]);

  return null;
}
