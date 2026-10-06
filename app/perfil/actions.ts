"use server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { photoBucket, readProfile, type ProfileState } from "@/lib/profile";

export async function saveProfile(previous: ProfileState, form: FormData): Promise<ProfileState> {
  const supabase = await createServerSupabaseClient();
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError || !identity.user?.email_confirmed_at) return { success: false, message: "Entre na conta com e-mail confirmado para salvar." };
  const userId = identity.user.id;
  let fields;
  try { fields = readProfile(form); }
  catch (error) { return { success: false, message: error instanceof Error ? error.message : "Confira os dados do perfil." }; }
  const { data: existing, error: readError } = await supabase.from("duoeto_profiles").select("photo_path").eq("user_id", userId).maybeSingle();
  if (readError) return { success: false, message: "O armazenamento de perfis ainda não está disponível. Tente novamente mais tarde." };
  let photoPath: string = existing?.photo_path ?? "";
  let uploadedPath = "";
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(photo.type)) return { success: false, message: "Escolha uma foto JPG, PNG ou WebP de até 3 MB." };
    let processed: Buffer;
    try {
      const input = sharp(Buffer.from(await photo.arrayBuffer()), { limitInputPixels: 25000000, animated: false });
      const metadata = await input.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error();
      processed = await input.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    } catch { return { success: false, message: "Não foi possível ler a imagem. Escolha outra foto JPG, PNG ou WebP." }; }
    photoPath = userId + "/" + randomUUID() + ".jpg";
    const { error } = await supabase.storage.from(photoBucket).upload(photoPath, processed, { contentType: "image/jpeg", upsert: false });
    if (error) return { success: false, message: "Não foi possível enviar a foto. Tente novamente." };
    uploadedPath = photoPath;
  }
  if (!photoPath) return { success: false, message: "Adicione uma foto principal para salvar seu perfil." };
  const profile = { ...fields, photo_path: photoPath };
  const { error } = await supabase.from("duoeto_profiles").upsert({ ...profile, user_id: userId }, { onConflict: "user_id" });
  if (error) {
    if (uploadedPath) await supabase.storage.from(photoBucket).remove([uploadedPath]);
    return { success: false, message: "Não foi possível salvar o perfil. Seus dados anteriores foram preservados." };
  }
  const { data: signedPhoto } = await supabase.storage.from(photoBucket).createSignedUrl(photoPath, 3600);
  revalidatePath("/perfil");
  return { success: true, message: "Perfil salvo. Você pode editar ou pré-visualizar quando quiser.", profile, photoUrl: signedPhoto?.signedUrl };
}
