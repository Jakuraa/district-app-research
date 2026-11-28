import { redirect } from "next/navigation";

export default function DeprecatedVerticalDetailRedirect() {
  redirect("/events");
}
