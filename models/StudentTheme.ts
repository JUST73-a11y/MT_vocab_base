import mongoose, { Schema, model, models } from 'mongoose';

const ThemeColorSchema = new Schema({
  primary:    { type: String, default: '#6366f1' },
  secondary:  { type: String, default: '#a855f7' },
  accent:     { type: String, default: '#10b981' },
  background: { type: String, default: '#09090f' },
  surface:    { type: String, default: '#12121c' },
  card:       { type: String, default: 'rgba(255,255,255,0.03)' },
  text:       { type: String, default: '#ffffff' },
  textMuted:  { type: String, default: 'rgba(255,255,255,0.55)' },
  border:     { type: String, default: 'rgba(255,255,255,0.10)' },
  success:    { type: String, default: '#10b981' },
  warning:    { type: String, default: '#f59e0b' },
  danger:     { type: String, default: '#ef4444' },
}, { _id: false });

const ThemeBackgroundSchema = new Schema({
  type:          { type: String, enum: ['color','gradient','preset','image'], default: 'preset' },
  color:         { type: String, default: '#09090f' },
  gradient:      { type: String, default: 'midnight' },
  preset:        { type: String, default: 'default' },
  imageUrl:      { type: String, default: null },
  imagePosition: { type: String, enum: ['center','top','bottom'], default: 'center' },
  imageSize:     { type: String, enum: ['cover','contain'], default: 'cover' },
  overlay:       { type: String, enum: ['none','light','dark','soft'], default: 'soft' },
  blur:          { type: String, enum: ['none','subtle','medium','strong'], default: 'none' },
}, { _id: false });

const ThemeTypographySchema = new Schema({
  fontFamily: { type: String, enum: ['inter','poppins','nunito','system'], default: 'inter' },
  sizeScale:  { type: String, enum: ['small','normal','large'], default: 'normal' },
  weight:     { type: String, enum: ['normal','medium','bold'], default: 'medium' },
}, { _id: false });

const ThemeButtonsSchema = new Schema({
  style:  { type: String, enum: ['rounded','pill','square','soft','glass'], default: 'rounded' },
  shadow: { type: String, enum: ['none','soft','medium','strong','glow'], default: 'soft' },
}, { _id: false });

const ThemeCardsSchema = new Schema({
  style:  { type: String, enum: ['solid','glass','soft','minimal','elevated'], default: 'glass' },
  radius: { type: String, enum: ['small','medium','large','xl','pill'], default: 'large' },
  shadow: { type: String, enum: ['none','soft','medium','strong','glow'], default: 'soft' },
  blur:   { type: String, enum: ['none','subtle','medium','strong'], default: 'subtle' },
}, { _id: false });

const ThemeNavbarSchema = new Schema({
  style:  { type: String, enum: ['glass','solid','translucent','floating','minimal'], default: 'glass' },
  blur:   { type: String, enum: ['none','subtle','medium','strong'], default: 'medium' },
  border: { type: String, enum: ['none','thin','glow'], default: 'thin' },
}, { _id: false });

const ThemeBordersSchema = new Schema({
  style:  { type: String, enum: ['none','thin','medium','soft'], default: 'thin' },
  radius: { type: String, enum: ['small','medium','large','xl','pill'], default: 'large' },
}, { _id: false });

const ThemeSpacingSchema = new Schema({
  density: { type: String, enum: ['compact','normal','relaxed'], default: 'normal' },
}, { _id: false });

const ThemeEffectsSchema = new Schema({
  animations: { type: String, enum: ['off','subtle','normal','playful'], default: 'normal' },
  glass:      { type: String, enum: ['off','soft','strong'], default: 'soft' },
  hover:      { type: String, enum: ['minimal','normal','playful'], default: 'normal' },
}, { _id: false });

const ThemeConfigSchema = new Schema({
  colors:     { type: ThemeColorSchema,      default: () => ({}) },
  background: { type: ThemeBackgroundSchema, default: () => ({}) },
  typography: { type: ThemeTypographySchema, default: () => ({}) },
  buttons:    { type: ThemeButtonsSchema,    default: () => ({}) },
  cards:      { type: ThemeCardsSchema,      default: () => ({}) },
  navbar:     { type: ThemeNavbarSchema,     default: () => ({}) },
  borders:    { type: ThemeBordersSchema,    default: () => ({}) },
  shadows:    { type: String, enum: ['none','soft','medium','strong','glow'], default: 'soft' },
  spacing:    { type: ThemeSpacingSchema,    default: () => ({}) },
  effects:    { type: ThemeEffectsSchema,    default: () => ({}) },
}, { _id: false });

const StudentThemeSchema = new Schema({
  studentId:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:       { type: String, required: true, trim: true, maxlength: 50 },
  config:     { type: ThemeConfigSchema, default: () => ({}) },
  isEquipped: { type: Boolean, default: false, index: true },
  source:     { type: String, enum: ['SYSTEM','STUDENT'], default: 'STUDENT' },
}, { timestamps: true });

// Compound index for fast per-student queries
StudentThemeSchema.index({ studentId: 1, isEquipped: 1 });

// Delete model cache in dev so hot reload works
if (process.env.NODE_ENV !== 'production' && mongoose.models.StudentTheme) {
  delete (mongoose.models as any).StudentTheme;
}

const StudentTheme = mongoose.models.StudentTheme || mongoose.model('StudentTheme', StudentThemeSchema);
export default StudentTheme;
