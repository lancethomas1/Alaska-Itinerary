// ─── Embedded trip photo thumbnails (base64 JPG, ~480px) ───
//
// The original component had ~13 photos as inline base64 strings (~400KB total).
// To keep the diff manageable, those have been extracted into this module.
//
// To restore the photos: open your original component paste, copy the entire
// `PHOTOS` object, and replace the export below.
//
// Until then, photos render as broken images and the lightbox shows nothing —
// but the rest of the app works fine.

export const PHOTOS = {
  may7_seawall:    { caption: "Stanley Park seawall — Lions Gate Bridge", src: "" },
  may7_selfie:     { caption: "Lance & Betsy at the seawall",            src: "" },
  may7_tidepools:  { caption: "Tidepools at Second Beach",                src: "" },
  may10_creek:     { caption: "Creek Street — salmon sculpture by the rapids", src: "" },
  may10_totem:     { caption: "Betsy beside a Tlingit totem pole",        src: "" },
  may11_launch:    { caption: "Ready to launch — kayak put-in",           src: "" },
  may11_kayak:     { caption: "Sitka kayak excursion — Summit in the harbor", src: "" },
  may11_paddle:    { caption: "Betsy paddling toward snowcapped peaks",   src: "" },
  may12_glacier:   { caption: "Mendenhall Glacier — victory pose",        src: "" },
  may12_falls:     { caption: "Nugget Falls — Betsy in the mist",         src: "" },
  may12_brewery:   { caption: "Forbidden Peak Brewery — cheers",          src: "" },
  may12_eagle:     { caption: "Eagle Beach — snowy forest trail",         src: "" },
  may12_rainforest:{ caption: "Tongass rainforest — Juneau trail",        src: "" },
};
