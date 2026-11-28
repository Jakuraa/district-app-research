import { redirect } from "next/navigation";

export default function DeprecatedVerticalRedirect() {
  redirect("/events");
}
