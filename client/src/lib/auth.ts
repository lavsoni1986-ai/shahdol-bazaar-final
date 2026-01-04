import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { app } from "./firebase";

export const auth = getAuth(app);

export function setupRecaptcha(containerId: string) {
  return new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });
}

export function sendOTP(phone: string, verifier: RecaptchaVerifier) {
  return signInWithPhoneNumber(auth, phone, verifier);
}
