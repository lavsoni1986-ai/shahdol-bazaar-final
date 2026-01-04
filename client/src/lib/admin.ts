import { getAuth, onAuthStateChanged } from "firebase/auth";

export function onAdminAuth(cb: (isAdmin: boolean) => void) {
  const auth = getAuth();
  return onAuthStateChanged(auth, (user) => {
    cb(!!user && user.email === "admin@shahdolbazaar.com");
  });
}
