import { ProfileGallery } from "@/components/profile-gallery";
import { notFound } from "next/navigation";
import { ApplicationShell } from "@/components/application-shell";
import { ReportForm } from "@/components/report-form";
import { ReputationPanel } from "@/components/reputation";
import { requireUser } from "@/lib/supabase/require-user";
import { connectionAction } from "@/app/mensagens/actions";
import type { FeedProfile } from "@/lib/feed";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const result = await connectionAction("profile", id);
  if (result.error || !result.data) notFound();
  const profile = result.data as FeedProfile;
  return <ApplicationShell><main className="page profile-workspace"><article className="panel">
    <ProfileGallery key={id} target={id} name={profile.display_name} />
    <h1 className="person-name">{profile.display_name}, {profile.age}</h1>
    <p>{profile.city}, {profile.state}</p><p className="profile-about">{profile.about}</p>
    <div className="chips">{profile.interests.map(interest => <span className="chip" key={interest}>{interest}</span>)}</div>
    <p>{profile.objectives.join(", ")}</p>
    {id !== user.id ? <ReportForm subject="profile" target={id} /> : null}
    <ReputationPanel key={id} target={id} readOnly={id === user.id} />
  </article></main></ApplicationShell>;
}
