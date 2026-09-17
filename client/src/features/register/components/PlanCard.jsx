import React from 'react';

export default function PlanCard({ plan, isPopular, cycleLabel, onSelect }) {
  const color = plan.color || '#2563eb';
  const tint = color + '1a'; // ~10% alpha tint of the plan's own color
  const isFree = Number(plan.price) === 0;

  return (
    <div className="pp-card" style={isPopular ? { ...cardStyle, border: `2px solid ${color}` } : cardStyle}>
      <div style={{ ...topBarStyle, background: color }} />

      {isPopular && (
        <div style={{ ...badgeStyle, background: color }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.2 22 12 18.27 5.8 22 7 14.14l-5-4.87 7.1-1.01L12 2z"/></svg>
          Popular
        </div>
      )}

      <div style={nameStyle}>{plan.name}</div>
      <div style={descStyle}>{plan.description}</div>

      <div style={priceRowStyle}>
        {isFree ? 'Free' : `LKR ${Number(plan.price).toLocaleString()}`}
        {!isFree && <span style={cycleStyle}> {cycleLabel}</span>}
      </div>

      <div style={dividerStyle} />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {(plan.features || []).map((feat) => (
          <div key={feat} style={featureRowStyle}>
            <div style={{ ...checkDotStyle, background: tint }}>
              <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={featureTextStyle}>{feat}</span>
          </div>
        ))}
      </div>

      <button className="pp-cta" onClick={onSelect} style={{ ...ctaStyle, background: color }}>
        Get Started
      </button>

      {plan.trialDays > 0 && (
        <div style={trialNoteStyle}>Includes {plan.trialDays}-day trial</div>
      )}
    </div>
  );
}

const cardStyle = {
  position: 'relative',
  background: '#fff',
  borderRadius: 16,
  padding: '36px 30px 30px',
  display: 'flex',
  flexDirection: 'column',
  border: '2px solid transparent',
};
const topBarStyle = { position: 'absolute', top: 0, left: 0, right: 0, height: 6, borderRadius: '16px 16px 0 0' };
const badgeStyle = {
  position: 'absolute',
  top: 16,
  right: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  color: '#fff',
  font: '600 12px var(--font)',
  padding: '5px 12px',
  borderRadius: 9999,
  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
};
const nameStyle = { marginTop: 12, font: '600 20px var(--font)', color: '#0f172a' };
const descStyle = { font: '400 14px var(--font)', color: '#94a3b8', marginTop: 4, minHeight: 36 };
const priceRowStyle = { font: '700 38px var(--font)', color: '#0f172a', margin: '10px 0' };
const cycleStyle = { font: '500 15px var(--font)', color: '#94a3b8' };
const dividerStyle = { height: 1, background: '#eef1f5', marginBottom: 16 };
const featureRowStyle = { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 };
const checkDotStyle = { width: 20, height: 20, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 };
const featureTextStyle = { fontSize: 15, color: '#475569', lineHeight: 1.5 };
const ctaStyle = { border: 'none', color: '#fff', font: '600 16px var(--font)', padding: 15, borderRadius: 9999, width: '100%', marginTop: 8, cursor: 'pointer' };
const trialNoteStyle = { textAlign: 'center', fontSize: 12.5, color: '#94a3b8', marginTop: 12 };
