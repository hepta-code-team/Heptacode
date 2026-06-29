import { RouterProvider } from "react-router";
import { router } from "./router";
import { AssessmentProvider } from "../lib/AssessmentContext";

export default function App() {
  return (
    <AssessmentProvider>
      <RouterProvider router={router} />
    </AssessmentProvider>
  );
}
