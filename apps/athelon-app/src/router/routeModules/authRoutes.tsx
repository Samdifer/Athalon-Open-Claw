import { Route } from "react-router-dom";
import SignInPage from "@/app/(auth)/sign-in/[[...sign-in]]/page";
import SignUpPage from "@/app/(auth)/sign-up/[[...sign-up]]/page";

export function authRoutes() {
  return [
    <Route key="sign-in" path="/sign-in/*" element={<SignInPage />} />,
    <Route key="sign-up" path="/sign-up/*" element={<SignUpPage />} />,
  ];
}
