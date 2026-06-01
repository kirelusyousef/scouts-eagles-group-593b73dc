// ImgBB image hosting. Files are POSTed via FormData and we return the
// direct image URL that can be stored as a string in any Google Sheet cell.
import { toast } from "sonner";

const IMGBB_KEY = "1cbe3d0427f934c47bd0b5810d5e88c8";
const IMGBB_URL = `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`;

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(IMGBB_URL, { method: "POST", body: fd });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`ImgBB ${res.status}: ${txt.slice(0, 120)}`);
  }
  const json = await res.json();
  const url: string | undefined = json?.data?.url;
  if (!url) throw new Error("لم يتم استلام رابط الصورة من ImgBB");
  return url;
}

export async function uploadImageWithToast(file: File): Promise<string | null> {
  try {
    const url = await uploadImage(file);
    toast.success("تم رفع الصورة بنجاح");
    return url;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    toast.error(`فشل رفع الصورة: ${msg}`);
    return null;
  }
}

export async function uploadImages(files: File[]): Promise<string[]> {
  const out: string[] = [];
  for (const f of files) out.push(await uploadImage(f));
  return out;
}
