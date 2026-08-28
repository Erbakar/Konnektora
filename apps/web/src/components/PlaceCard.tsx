import type { Place } from "@konnektora/shared";
import { Building2, Calendar, MapPin, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { recordContentImpression, rememberContentSource, resolveMediaUrl } from "../lib/api";
import { DistanceLabel } from "./DistanceLabel";
import { useLanguage } from "../lib/i18n";
import { localizeCityName, localizeCountryName } from "../lib/formats";

export const placeTypeLabels: Record<string, string> = {
  community: "🏘️ Community space", coworking: "💻 Coworking", venue: "🎭 Event venue", cafe: "☕ Cafe", restaurant: "🍽️ Restaurant", bar: "🍸 Bar", club: "🎶 Club", gallery: "🖼️ Gallery", outdoor: "🌳 Outdoor", studio: "🎙️ Studio", office: "🏢 Office",
  food_drink: "🍽️ Food & Drink", nightlife_music: "🎵 Nightlife & Music", events_venues: "🎭 Events & Venues",
  arts_culture: "🎨 Arts & Culture", sports_activities: "🏃 Sports & Activities", cafes: "☕ Cafés",
  outdoors: "🌳 Outdoors", games_hobbies: "🎮 Games & Hobbies", work_networking: "💼 Work & Networking",
  wellness: "🧘 Wellness", shopping: "🛍️ Shopping", hotels_hostels: "🏨 Hotels / Hostels", other: "Others",
};

export const placeTypeLabelsTr: Record<string, string> = {
  community: "🏘️ Topluluk alanı", coworking: "💻 Ortak çalışma", venue: "🎭 Etkinlik mekânı", cafe: "☕ Kafe", restaurant: "🍽️ Restoran", bar: "🍸 Bar", club: "🎶 Kulüp", gallery: "🖼️ Galeri", outdoor: "🌳 Açık alan", studio: "🎙️ Stüdyo", office: "🏢 Ofis",
  food_drink: "🍽️ Yeme & İçme", nightlife_music: "🎵 Gece Hayatı & Müzik", events_venues: "🎭 Etkinlik & Mekân",
  arts_culture: "🎨 Sanat & Kültür", sports_activities: "🏃 Spor & Aktiviteler", cafes: "☕ Kafeler",
  outdoors: "🌳 Açık Hava", games_hobbies: "🎮 Oyun & Hobiler", work_networking: "💼 İş & Networking",
  wellness: "🧘 Sağlık & İyi Yaşam", shopping: "🛍️ Alışveriş", hotels_hostels: "🏨 Otel / Hostel", other: "Diğer",
};

export const placeTypeKeys = ["community", "coworking", "venue", "cafe", "restaurant", "bar", "club", "gallery", "outdoor", "studio", "office", "food_drink", "nightlife_music", "events_venues", "arts_culture", "sports_activities", "cafes", "outdoors", "games_hobbies", "work_networking", "wellness", "shopping", "hotels_hostels", "other"] as const;

export function PlaceCard({ place }: { place: Place }) {
  const cardRef = useRef<HTMLElement>(null);
  const { language } = useLanguage();
  const memberCount = place.memberCount ?? place.followerCount;
  const followingCount = place.followingMemberCount ?? 0;
  const memberSummary = followingCount > 0
    ? `${memberCount || place.inviteCount} ${memberCount ? (language === "tr" ? "üye" : "members") : (language === "tr" ? "davetli" : "invited")} · ${followingCount} ${language === "tr" ? "takip ettiğiniz" : "you follow"}`
    : place.inviteCount > 0
      ? `${memberCount} ${language === "tr" ? "üye" : "members"} · ${place.inviteCount} ${language === "tr" ? "davetli" : "invited"}`
      : `${memberCount} ${language === "tr" ? "üye" : "members"}`;
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35)) {
        void recordContentImpression("place", place.id);
        observer.disconnect();
      }
    }, { threshold: [0.35] });
    observer.observe(element);
    return () => observer.disconnect();
  }, [place.id]);
  return <article className="event-card place-card" ref={cardRef}>
    <Link className={`event-card-media${place.coverImageUrl ? "" : " event-card-media-fallback"}`} onClick={() => rememberContentSource("place", place.id)} to={`/places/${place.slug}`}>
      {place.coverImageUrl ? <img alt="" src={resolveMediaUrl(place.coverImageUrl)}/> : <Building2 aria-hidden="true" size={34}/>}
      <span className="event-card-visibility-badge">{place.visibility === "invite_only" ? language === "tr" ? "Sadece davetli" : "Invite only" : place.visibility === "approval_required" ? language === "tr" ? "Onay gerekli" : "Approval required" : language === "tr" ? "Herkese açık" : "Open to everyone"}</span>
    </Link>
    <div><span className="eyebrow">{(language === "tr" ? placeTypeLabelsTr : placeTypeLabels)[place.placeType ?? ""] ?? (language === "tr" ? "Mekân" : "Place")}</span><h3><Link onClick={() => rememberContentSource("place", place.id)} to={`/places/${place.slug}`}>{place.name}</Link></h3></div>
    <div className="event-details">
      <span><MapPin size={16}/>{[localizeCityName(place.city, language), localizeCountryName(place.country, language)].filter(Boolean).join(", ") || (language === "tr" ? "Konum belirtilmedi" : "Location not specified")}</span>
      <span><Users size={16}/>{memberSummary}</span>
      {place.upcomingEventCount ? <span><Calendar size={16}/>{place.upcomingEventCount} {language === "tr" ? "yaklaşan etkinlik" : "upcoming events"}</span> : null}
      <DistanceLabel latitude={place.latitude} longitude={place.longitude}/>
    </div>
  </article>;
}
