import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useAppStore } from "../app/store";

export const Capture = (): JSX.Element => {
  const navigate = useNavigate();
  const imageFile = useAppStore((state) => state.imageFile);

  useEffect(() => {
    if (!imageFile) {
      navigate(ROUTES.landing, { replace: true });
      return;
    }

    navigate(ROUTES.processing, { replace: true });
  }, [imageFile, navigate]);

  return <main className="screen processing-screen">Preparing image…</main>;
};
