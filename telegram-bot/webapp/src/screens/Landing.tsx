import { motion } from 'framer-motion';
import {
  BookOpen, Layers, Languages, BarChart3, Flame, Volume2, ArrowRight, Sparkles, type LucideIcon,
} from 'lucide-react';

const FEATURES: { icon: LucideIcon; color: string; title: string; text: string }[] = [
  { icon: BookOpen, color: 'var(--accent)', title: 'Κουίζ', text: 'Ερωτήσεις πολλαπλής επιλογής σε ιστορία, πολιτισμό, νομοθεσία και γεωγραφία.' },
  { icon: Layers, color: 'var(--violet)', title: 'Έξυπνες κάρτες', text: 'Σύστημα επανάληψης (SRS) που φέρνει κάθε κάρτα ακριβώς τη σωστή στιγμή.' },
  { icon: Languages, color: 'var(--mint)', title: 'Λεξιλόγιο', text: '150 βασικές λέξεις με μετάφραση, σημειώσεις και προφορά.' },
  { icon: Volume2, color: 'var(--amber)', title: 'Προφορά', text: 'Άκου κάθε ελληνική λέξη με φυσική εκφώνηση από Google TTS.' },
  { icon: Flame, color: 'var(--coral)', title: 'Σερί & στόχος', text: 'Καθημερινός στόχος και σερί που σε κρατούν συνεπή.' },
  { icon: BarChart3, color: 'var(--pink)', title: 'Πρόοδος', text: 'Στατιστικά ανά θέμα, ιστορικό και ποσοστό επιτυχίας.' },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const rise = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.06, ease: EASE } }),
};

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="landing">
      <nav className="lp-nav">
        <div className="lp-brand">
          <span className="lp-logo"><Sparkles size={20} color="#fff" strokeWidth={2.4} /></span>
          Hellas Study
        </div>
        <button className="lp-btn ghost" onClick={onStart}>Είσοδος</button>
      </nav>

      <header className="lp-hero">
        <motion.span className="lp-pill" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Sparkles size={15} color="var(--accent-2)" /> Μάθε ελληνικά <b>έξυπνα</b>
        </motion.span>
        <motion.h1 initial="hidden" animate="show" variants={rise}>
          Τα ελληνικά,<br /><span className="grad-text">όπως ποτέ πριν.</span>
        </motion.h1>
        <motion.p initial="hidden" animate="show" custom={1} variants={rise}>
          Κουίζ, κάρτες με έξυπνη επανάληψη και λεξιλόγιο με προφορά — όλα σε μία καθαρή,
          γρήγορη εφαρμογή. Χτίσε το σερί σου και δες την πρόοδό σου κάθε μέρα.
        </motion.p>
        <motion.div className="lp-cta" initial="hidden" animate="show" custom={2} variants={rise}>
          <button className="lp-btn primary" onClick={onStart}>Ξεκίνα τώρα <ArrowRight size={19} strokeWidth={2.6} /></button>
          <button className="lp-btn ghost" onClick={onStart}>Δες την εφαρμογή</button>
        </motion.div>

        <motion.div
          className="lp-preview"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
        >
          <div className="lp-preview-row">
            {FEATURES.slice(0, 3).map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="tile" style={{ minHeight: 120 }}>
                  <span className="tile-ic" style={{ background: `color-mix(in srgb, ${f.color} 20%, transparent)`, color: f.color }}>
                    <Icon size={24} strokeWidth={2.3} />
                  </span>
                  <span className="tile-t">{f.title}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </header>

      <section className="lp-features">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              className="lp-feature"
              variants={rise}
              custom={i % 3}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
            >
              <span className="ic" style={{ background: `color-mix(in srgb, ${f.color} 18%, transparent)`, color: f.color }}>
                <Icon size={24} strokeWidth={2.3} />
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </motion.div>
          );
        })}
      </section>

      <motion.section className="lp-stats" variants={rise} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <div className="lp-stat"><div className="n grad-text">150+</div><div className="l">λέξεις</div></div>
        <div className="lp-stat"><div className="n grad-text">4</div><div className="l">θέματα κουίζ</div></div>
        <div className="lp-stat"><div className="n grad-text">SRS</div><div className="l">έξυπνη επανάληψη</div></div>
      </motion.section>

      <motion.section
        className="lp-foot"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        viewport={{ once: true }}
      >
        <h2>Έτοιμος να ξεκινήσεις;</h2>
        <button className="lp-btn primary" onClick={onStart}>Ξεκίνα δωρεάν <ArrowRight size={19} strokeWidth={2.6} /></button>
      </motion.section>
    </div>
  );
}
