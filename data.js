/* SR Handicraft & Furniture — built-in catalogue.
   The website shows this instantly, then switches to whatever is saved in the
   admin panel (admin.html). The admin panel's one-time "Import" copies this
   file into the database, so after that, edit products and photos there. */
/* ============ CATEGORIES (mega menu) ============ */
const CATS = [
  {key:"furniture", name:"Furniture", art:"bed", groups:[
    {name:"Beds", subs:["King Size Beds","Queen Size Beds"]},
    {name:"Living Room", subs:["Sofa Sets","Coffee Tables","Nesting Tables","Console Tables"]},
    {name:"Dining", subs:["Dining Sets"]},
    {name:"Storage", subs:["Sideboards","Bar Cabinets"]},
    {name:"Bedroom", subs:["Dressing Tables"]},
    {name:"Study", subs:["Study Tables"]}
  ]},
  {key:"pooja", name:"Pooja Mandir", art:"mandir", groups:[
    {name:"Mandirs", subs:["Floor Mandirs"]}
  ]}
];


/* ============================================================
   PHOTOS: yahan apni asli photos ke link daalo
   ------------------------------------------------------------
   - Har jagah EK se zyada photo daal sakte ho. Site par wo
     apne aap ghoomti rahengi (float karti rahengi).
   - Photo ka link kuch bhi ho sakta hai:
       "sofa-1.jpg"  (same folder mein  banao)
       "https://..."        (Google Drive/Cloudinary/koi bhi link)
   - Jahan photo nahi daaloge, wahan purani drawing hi dikhegi.
   - Product ki photo: uski id ka number likho (neeche dekho).
   ============================================================ */
const PHOTOS = {
  /* --- Sections --- */
  hero:      ["bed-room-1-w.jpg","sofa-set-2.jpg","poster-bed-2-w.jpg","sofa-set-1.jpg","bed-room-3-w.jpg"],
  promo_dining:  ["dining-set-2.jpg","dining-set-1.jpg"],
  promo_pooja:   ["mandir-1-room.jpg","mandir-2-room.jpg"],
  promo_custom:  ["wardrobe-1.jpg","wardrobe-2.jpg","dressing-1.jpg"],
  showroom:  ["sofa-set-3.jpg","mandir-2.jpg","sideboard-1.jpg","dressing-1.jpg","mandir-1.jpg"],
  strip:     ["bed-storage-3.jpg","mandir-2.jpg","bed-tile-1.jpg","dressing-1.jpg","dining-top-1.jpg","poster-bed-3.jpg","mandir-1.jpg","bed-storage-1.jpg","coffee-table-room.jpg","sofa-jaali-detail.jpg","bar-cabinet-room.jpg","nesting-room.jpg","sideboard-room.jpg","bed-tile-1-detail.jpg","dining-set-3-detail.jpg"],

  /* --- Category tiles (sub-category ke naam se) --- */
  tile_beds:["bed-room-2.jpg","poster-bed-1.jpg"],
  tile_dining:["dining-set-2.jpg","dining-set-1.jpg"],
  tile_pooja:["mandir-1-room.jpg","mandir-2-room.jpg"],
  tile_dressing:["dressing-1.jpg"],
  tile_study:["study-2.jpg","study-1.jpg"],
  tile_sofa:["sofa-set-1.jpg","sofa-jaali-1.jpg","sofa-wood-1.jpg"],
  tile_coffee:["coffee-table-room.jpg","coffee-table-1.jpg"],
  tile_storage:["sideboard-room.jpg","bar-cabinet-room.jpg"],
  cat_furniture:["bed-room-1.jpg"],
  cat_pooja:["mandir-1-room.jpg"],

  /* --- Products (id ke saamne uski photos) --- */
  4:  ["bed-room-1.jpg","bed-storage-2.jpg","bed-storage-1.jpg"],
  5:  ["bed-room-2.jpg","bed-room-3.jpg","bed-storage-3.jpg"],
  6:  ["dining-set-2.jpg","dining-set-1.jpg","dining-top-1.jpg"],
  16: ["mandir-1-room.jpg","mandir-1.jpg","mandir-1-detail.jpg"],
  17: ["mandir-2-room.jpg","mandir-2.jpg","mandir-2-detail.jpg"],
  20: ["dressing-1.jpg","dressing-1-detail.jpg","dressing-1-detail2.jpg"],
  26: ["poster-bed-3.jpg","poster-bed-1.jpg","poster-bed-2.jpg"],
  29: ["study-1.jpg","study-2.jpg"],
  30: ["bed-tile-1.jpg","bed-tile-1-detail.jpg"],
  40: ["sofa-set-1.jpg","sofa-set-2.jpg","sofa-set-3.jpg"],
  41: ["sofa-jaali-1.jpg","sofa-jaali-detail.jpg","sofa-jaali-detail2.jpg"],
  42: ["sofa-wood-1.jpg","sofa-wood-detail.jpg","sofa-wood-detail2.jpg"],
  43: ["coffee-table-room.jpg","coffee-table-1.jpg","coffee-table-detail.jpg","sofa-set-3.jpg"],
  44: ["nesting-room.jpg","nesting-1.jpg","nesting-detail.jpg"],
  45: ["console-1.jpg","console-1-detail.jpg"],
  46: ["sideboard-room.jpg","sideboard-1.jpg","sideboard-detail.jpg"],
  47: ["bar-cabinet-room.jpg","bar-cabinet-1.jpg","bar-cabinet-detail.jpg","bar-cabinet-2.jpg"],
  48: ["bed-slat-room.jpg","bed-slat-1.jpg","bed-slat-detail.jpg"],
  49: ["dining-set-3.jpg","dining-set-3-detail.jpg","dining-set-3-detail2.jpg"],
};


/* ============ PRODUCTS: yahan apne products daalo ============ */
const P = [
 {id:4, name:"Sheesham King Size Bed with Storage",  cat:"furniture",sub:"King Size Beds", type:"bed",   color:"#A34A3A",material:"Sheesham Wood",price:54999},
 {id:30,name:"Hand Painted Tile Headboard Bed",      cat:"furniture",sub:"King Size Beds", type:"bed",   color:"#6B4A33",material:"Sheesham Wood",price:49999},
 {id:26,name:"Tile Work Poster Bed",                 cat:"furniture",sub:"Queen Size Beds",type:"bed",   color:"#7A4A2C",material:"Sheesham Wood",price:44999},
 {id:5, name:"Sheesham Queen Size Bed",              cat:"furniture",sub:"Queen Size Beds",type:"bed",   color:"#C7A36A",material:"Sheesham Wood",price:31999},
 {id:6, name:"Carved Sheesham 6 Seater Dining Set",  cat:"furniture",sub:"Dining Sets",    type:"table", color:"#7A4A2C",material:"Sheesham Wood",price:46999},
 {id:20,name:"Arched Mirror Dressing Table",         cat:"furniture",sub:"Dressing Tables",type:"mirror",color:"#8E5B3A",material:"Sheesham Wood",price:24999},
 {id:29,name:"Sheesham Study Table",                 cat:"furniture",sub:"Study Tables",   type:"table", color:"#8B5E3C",material:"Sheesham Wood",price:11499},
 {id:16,name:"Carved Sheesham Pooja Mandir",         cat:"pooja",    sub:"Floor Mandirs",  type:"mandir",color:"#8A4B2A",material:"Sheesham Wood",price:18999},
 {id:17,name:"Jaali Door Sheesham Pooja Mandir",     cat:"pooja",    sub:"Floor Mandirs",  type:"mandir",color:"#B97A45",material:"Sheesham Wood",price:16999},
 {id:48,name:"Slatted Headboard Box Storage Bed",    cat:"furniture",sub:"King Size Beds", type:"bed",   color:"#7A4A2C",material:"Sheesham Wood",price:39999},
 {id:40,name:"Carved Sheesham Sofa Set with Coffee Table",cat:"furniture",sub:"Sofa Sets", type:"sofa",  color:"#7A4A2C",material:"Sheesham Wood",price:89999},
 {id:41,name:"Jaali Work Sheesham Sofa Set",         cat:"furniture",sub:"Sofa Sets",      type:"sofa",  color:"#5A3B28",material:"Sheesham Wood",price:64999},
 {id:42,name:"Sheesham Wooden Sofa Set",             cat:"furniture",sub:"Sofa Sets",      type:"sofa",  color:"#8B5E3C",material:"Sheesham Wood",price:42999},
 {id:43,name:"Brass Stud Coffee Table with Stools",  cat:"furniture",sub:"Coffee Tables",  type:"table", color:"#7A4A2C",material:"Sheesham Wood",price:22999},
 {id:44,name:"Sheesham Nesting Tables (Set of 3)",   cat:"furniture",sub:"Nesting Tables", type:"table", color:"#8E5B3A",material:"Sheesham Wood",price:9999},
 {id:45,name:"Sheesham Console Table",               cat:"furniture",sub:"Console Tables", type:"table", color:"#A34A3A",material:"Sheesham Wood",price:14999},
 {id:49,name:"Jaali Back Sheesham Dining Set",       cat:"furniture",sub:"Dining Sets",    type:"table", color:"#8B5E3C",material:"Sheesham Wood",price:52999},
 {id:46,name:"Sheesham Sideboard with Drawers",      cat:"furniture",sub:"Sideboards",     type:"shelf", color:"#8E5B3A",material:"Sheesham Wood",price:38999},
 {id:47,name:"Brass Stud Bar Cabinet",               cat:"furniture",sub:"Bar Cabinets",   type:"wardrobe",color:"#6B4A33",material:"Sheesham Wood",price:34999}
];


/* ============ CUSTOM WORK: wardrobes made to order (add more lines to show more) ============ */
const CUSTOM_WORK = [
  ["wardrobe-1.jpg","4-door wardrobe with diamond block carving"],
  ["wardrobe-2.jpg","Floor-to-ceiling wardrobe with loft storage, made to fit the room"],
  ["wardrobe-3.jpg","Hand carved floral wardrobe doors (close-up)"],
  ["wardrobe-4.jpg","4-door panel wardrobe in a rich mahogany finish"],
  ["wardrobe-5.jpg","2-door wardrobe with drawers"],
  ["wardrobe-6.jpg","Wardrobe with 3D block carving (close-up)"],
];
