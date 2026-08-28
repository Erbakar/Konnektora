UPDATE "events" AS event
SET
  "latitude" = coordinates."latitude",
  "longitude" = coordinates."longitude",
  "updated_at" = CURRENT_TIMESTAMP
FROM (VALUES
  ('global-startup-demo-night-420001', 51.5074, -0.1278),
  ('ai-product-builders-breakfast-420002', 52.3676, 4.9041),
  ('climate-tech-founder-roundtable-420004', 52.5200, 13.4050),
  ('founders-operators-mixer-420005', 40.7128, -74.0060),
  ('investor-coffee-chats-420007', 48.8566, 2.3522),
  ('community-leaders-dinner-420008', 38.7223, -9.1393),
  ('vc-reverse-pitch-420011', 37.7749, -122.4194),
  ('impact-capital-roundtable-420012', 55.6761, 12.5683),
  ('co-founder-matching-lab-420015', 43.6532, -79.3832),
  ('founder-story-night-420016', 41.0082, 28.9784)
) AS coordinates("slug", "latitude", "longitude")
WHERE event."slug" = coordinates."slug";
