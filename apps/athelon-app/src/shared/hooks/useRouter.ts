import { useNavigate } from "react-router-dom";

/** Drop-in shim so pages migrated from Next.js can keep `router.push` / `router.back` / `router.replace` calls unchanged. */
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    back: () => navigate(-1),
  };
}
