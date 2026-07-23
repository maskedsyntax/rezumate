import { permanentRedirect } from "next/navigation";

import { APP_STORE_URL } from "../../lib/app-store";

export default function WaitlistPage() {
  permanentRedirect(APP_STORE_URL);
}
