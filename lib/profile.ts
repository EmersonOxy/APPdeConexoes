export const interestOptions = ["Jogos", "Filmes", "Música", "Academia", "Corrida", "Cozinhar", "Viajar", "Livros", "Gatos", "Cachorros", "Arte"];
export const objectiveOptions = ["Namoro", "Amizade", "Outras conexões", "Ainda pensando"];
export const stateOptions = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
export const photoBucket = "duoeto-profile-photos";
export type Profile = {
  display_name: string; birth_date: string; city: string; state: string;
  about: string; interests: string[]; objectives: string[]; photo_path: string;
};
export type ProfileState = { message: string; success: boolean; profile?: Profile; photoUrl?: string };
export function ageFromBirthDate(value: string, today = new Date()): number {
  const birth = new Date(value + "T00:00:00Z");
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}
export function readProfile(form: FormData): Omit<Profile, "photo_path"> {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const profile = {
    display_name: text("display_name"), birth_date: text("birth_date"),
    city: text("city"), state: text("state"), about: text("about"),
    interests: [...new Set(form.getAll("interests").map(String))],
    objectives: [...new Set(form.getAll("objectives").map(String))],
  };
  const date = new Date(profile.birth_date + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.birth_date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== profile.birth_date) throw new Error("Informe uma data de nascimento válida.");
  const age = ageFromBirthDate(profile.birth_date);
  if (age < 18 || age > 120) throw new Error("É necessário ter pelo menos 18 anos. Confira a data de nascimento.");
  if (profile.display_name.length < 2 || profile.display_name.length > 80) throw new Error("O nome deve ter entre 2 e 80 caracteres.");
  if (profile.city.length < 2 || profile.city.length > 100 || !stateOptions.includes(profile.state)) throw new Error("Informe a cidade e selecione um estado válido.");
  if (profile.about.length > 500) throw new Error("A descrição pode ter até 500 caracteres.");
  if (profile.interests.length > 15 || profile.interests.some(value => !interestOptions.includes(value))) throw new Error("Selecione interesses disponíveis.");
  if (profile.objectives.length > 5 || profile.objectives.some(value => !objectiveOptions.includes(value))) throw new Error("Selecione objetivos disponíveis.");
  return profile;
}
