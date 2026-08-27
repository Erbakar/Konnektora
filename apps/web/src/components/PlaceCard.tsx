import type { Place } from "@konnektora/shared";
import { Building2, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../lib/api";
import { DistanceLabel } from "./DistanceLabel";

export const placeTypeLabels: Record<string, string> = {
  food_drink: "🍽️ Food & Drink", nightlife_music: "🎵 Nightlife & Music", events_venues: "🎭 Events & Venues",
  arts_culture: "🎨 Arts & Culture", sports_activities: "🏃 Sports & Activities", cafes: "☕ Cafés",
  outdoors: "🌳 Outdoors", games_hobbies: "🎮 Games & Hobbies", work_networking: "💼 Work & Networking",
  wellness: "🧘 Wellness", shopping: "🛍️ Shopping", hotels_hostels: "🏨 Hotels / Hostels", other: "Others",
};

export function PlaceCard({ place }: { place: Place }) {
  return <article className="event-card place-card">
    <Link className={`event-card-media${place.coverImageUrl ? "" : " event-card-media-fallback"}`} to={`/places/${place.slug}`}>
      {place.coverImageUrl ? <img alt="" src={resolveMediaUrl(place.coverImageUrl)}/> : <Building2 aria-hidden="true" size={34}/>}
      <span className="event-card-visibility-badge">{place.visibility === "invite_only" ? "Sadece davetli" : place.visibility === "approval_required" ? "Onay gerekli" : "Herkese açık"}</span>
    </Link>
    <div><span className="eyebrow">{placeTypeLabels[place.placeType ?? ""] ?? "Mekân"}</span><h3><Link to={`/places/${place.slug}`}>{place.name}</Link></h3></div>
    <div className="event-details">
      <span><MapPin size={16}/>{[place.city, place.country].filter(Boolean).join(", ") || "Konum belirtilmedi"}</span>
      <span><Users size={16}/>{place.followerCount} takipçi{place.inviteCount ? ` · ${place.inviteCount} davet` : ""}</span>
      <DistanceLabel latitude={place.latitude} longitude={place.longitude}/>
    </div>
  </article>;
}
