import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase";

const storage = getStorage(app);

/**
 * Upload shop image and return public URL
 */
export async function uploadShopImage(
  shopId: string,
  file: File,
): Promise<string> {
  if (!shopId || !file) {
    throw new Error("shopId and file are required");
  }

  const imageRef = ref(storage, `shops/${shopId}/logo.jpg`);

  await uploadBytes(imageRef, file);

  const url = await getDownloadURL(imageRef);
  return url;
}
