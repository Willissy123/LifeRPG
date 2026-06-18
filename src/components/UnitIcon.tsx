import type { UnitType } from '../types';

export default function UnitIcon({
  type, color, size = 36,
}: {
  type: UnitType;
  color: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="18" cy="18" r="17" fill="#1a0f0a" stroke={color} strokeWidth="0.8" strokeOpacity="0.35"/>
      {type === 'Hastati'    && <HastatiIcon c={color}/>}
      {type === 'Legionary'  && <LegionaryIcon c={color}/>}
      {type === 'Archer'     && <ArcherIcon c={color}/>}
      {type === 'Equites'    && <EquitesIcon c={color}/>}
      {type === 'Ballista'   && <BallistaIcon c={color}/>}
      {type === 'Praetorian' && <PraetorianIcon c={color}/>}
    </svg>
  );
}

function HastatiIcon({ c }: { c: string }) {
  return (
    <g>
      {/* Pilum shaft + iron tip */}
      <line x1="22" y1="13" x2="33" y2="6" stroke="#9a7040" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="33" y1="6" x2="35" y2="4" stroke="#bbbbbb" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Parma (round shield) */}
      <circle cx="11" cy="17" r="4.5" fill={c} opacity="0.78"/>
      <circle cx="11" cy="17" r="4.5" fill="none" stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.25"/>
      <circle cx="11" cy="17" r="1.5" fill="#ffffff" fillOpacity="0.12"/>
      {/* Body */}
      <rect x="15.5" y="12.5" width="5.5" height="7.5" rx="1" fill={c}/>
      {/* Head */}
      <circle cx="18" cy="9" r="3" fill={c}/>
      {/* Helmet cap */}
      <path d="M15,9 Q18,4.5 21,9" fill={c}/>
      {/* Red crest */}
      <line x1="18" y1="5" x2="18" y2="2" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
      {/* Legs */}
      <line x1="17" y1="20" x2="15" y2="30" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="19.5" y1="20" x2="21.5" y2="30" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
    </g>
  );
}

function LegionaryIcon({ c }: { c: string }) {
  return (
    <g>
      {/* Scutum (large rectangular shield) */}
      <rect x="7" y="11" width="8" height="13.5" rx="2" fill={c} opacity="0.82"/>
      <rect x="7" y="11" width="8" height="13.5" rx="2" fill="none" stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.22"/>
      <ellipse cx="11" cy="17.8" rx="2" ry="2.5" fill="#ffffff" fillOpacity="0.1"/>
      {/* Torso */}
      <rect x="16" y="12" width="5.5" height="8" rx="1" fill={c}/>
      {/* Head */}
      <circle cx="19" cy="8" r="3" fill={c}/>
      {/* Full helmet */}
      <path d="M16,8 Q19,3 22,8" fill={c}/>
      {/* Large red crest */}
      <path d="M16.5,5 Q19,1.5 21.5,5" fill="#ef4444"/>
      {/* Gladius raised */}
      <line x1="21.5" y1="14" x2="30" y2="9" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <line x1="30" y1="9" x2="32" y2="7" stroke="#bbbbbb" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Legs */}
      <line x1="17.5" y1="20" x2="15.5" y2="30" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="20" y1="20" x2="22" y2="30" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
    </g>
  );
}

function ArcherIcon({ c }: { c: string }) {
  return (
    <g>
      {/* Bow stave */}
      <path d="M9,7 Q5,18 9,29" fill="none" stroke="#8b5e3c" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Bowstring */}
      <line x1="9" y1="7" x2="9" y2="29" stroke="#f5e6c8" strokeWidth="0.8" strokeOpacity="0.55"/>
      {/* Arrow shaft */}
      <line x1="9" y1="18" x2="27" y2="16" stroke="#9a7040" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Arrow head */}
      <polygon points="27,16 24,14.5 24,17.5" fill="#bbbbbb"/>
      {/* Quiver on back */}
      <rect x="24" y="11" width="3.5" height="8" rx="1" fill={c} opacity="0.6"/>
      {/* Body */}
      <rect x="16.5" y="12.5" width="5" height="7" rx="1" fill={c}/>
      {/* Right arm drawing the string */}
      <line x1="21.5" y1="15" x2="9" y2="18" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      {/* Head */}
      <circle cx="19" cy="9" r="2.8" fill={c}/>
      {/* Helmet */}
      <path d="M16.2,9 Q19,5 21.8,9" fill={c}/>
      {/* Legs */}
      <line x1="17.5" y1="19.5" x2="14.5" y2="30" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="20" y1="19.5" x2="22" y2="30" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
    </g>
  );
}

function EquitesIcon({ c }: { c: string }) {
  return (
    <g>
      {/* Horse body */}
      <ellipse cx="18" cy="23" rx="11" ry="5.5" fill={c} opacity="0.85"/>
      {/* Horse neck */}
      <path d="M27,21 Q31.5,18 30.5,14 Q29.5,11 26.5,13 Q26,17 27,21" fill={c}/>
      {/* Horse head */}
      <ellipse cx="29" cy="12.5" rx="3" ry="2.5" fill={c} transform="rotate(15,29,12.5)"/>
      {/* Horse legs */}
      <line x1="10" y1="27" x2="8" y2="33.5" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="14" y1="28.5" x2="12" y2="34" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="22" y1="28.5" x2="23" y2="34" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="26" y1="27" x2="28" y2="33" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      {/* Tail */}
      <path d="M7.5,22 Q3,20 4.5,26" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      {/* Rider torso */}
      <ellipse cx="16" cy="17" rx="3.5" ry="4.5" fill={c}/>
      {/* Rider head */}
      <circle cx="16" cy="11.5" r="2.8" fill={c}/>
      {/* Helmet */}
      <path d="M13.2,11.5 Q16,7 18.8,11.5" fill={c}/>
      {/* Crest */}
      <line x1="16" y1="7.5" x2="16" y2="4.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
      {/* Lance */}
      <line x1="19" y1="14.5" x2="34" y2="7.5" stroke="#8b5e3c" strokeWidth="2" strokeLinecap="round"/>
      <line x1="34" y1="7.5" x2="35.5" y2="5.5" stroke="#bbbbbb" strokeWidth="1.8" strokeLinecap="round"/>
    </g>
  );
}

function BallistaIcon({ c }: { c: string }) {
  return (
    <g>
      {/* Bolt loaded on track */}
      <line x1="5" y1="14" x2="30" y2="14" stroke="#9a7040" strokeWidth="3" strokeLinecap="round"/>
      <polygon points="30,14 27,12 27,16" fill="#bbbbbb"/>
      {/* Torsion cables */}
      <line x1="10" y1="9" x2="18" y2="14" stroke={c} strokeWidth="1.2" strokeOpacity="0.55"/>
      <line x1="26" y1="9" x2="18" y2="14" stroke={c} strokeWidth="1.2" strokeOpacity="0.55"/>
      {/* Torsion arms */}
      <line x1="13" y1="18" x2="10" y2="9" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="23" y1="18" x2="26" y2="9" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      {/* Crossbar */}
      <line x1="10" y1="9" x2="26" y2="9" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      {/* Chassis */}
      <rect x="7" y="18" width="22" height="6" rx="1.5" fill={c} opacity="0.9"/>
      {/* Wheels */}
      <circle cx="12" cy="27" r="4" fill="none" stroke={c} strokeWidth="2.5"/>
      <circle cx="24" cy="27" r="4" fill="none" stroke={c} strokeWidth="2.5"/>
      <line x1="12" y1="23" x2="12" y2="31" stroke={c} strokeWidth="1.2"/>
      <line x1="8" y1="27" x2="16" y2="27" stroke={c} strokeWidth="1.2"/>
      <line x1="24" y1="23" x2="24" y2="31" stroke={c} strokeWidth="1.2"/>
      <line x1="20" y1="27" x2="28" y2="27" stroke={c} strokeWidth="1.2"/>
    </g>
  );
}

function PraetorianIcon({ c }: { c: string }) {
  return (
    <g>
      {/* Scutum with eagle emblem */}
      <rect x="6.5" y="10" width="8.5" height="15" rx="2" fill={c} opacity="0.85"/>
      <rect x="6.5" y="10" width="8.5" height="15" rx="2" fill="none" stroke="#c9a84c" strokeWidth="1" strokeOpacity="0.5"/>
      {/* Eagle (simplified wings + body) */}
      <path d="M10.75,17.5 L7.5,14.5 M10.75,17.5 L14,14.5 M10.75,17.5 L10.75,22"
        stroke="#c9a84c" strokeWidth="1.2" strokeOpacity="0.7" strokeLinecap="round"/>
      {/* Torso with lorica segmentata bands */}
      <rect x="16" y="11" width="6" height="9" rx="1" fill={c}/>
      <line x1="16" y1="13.5" x2="22" y2="13.5" stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.2"/>
      <line x1="16" y1="16" x2="22" y2="16" stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.2"/>
      <line x1="16" y1="18.5" x2="22" y2="18.5" stroke="#ffffff" strokeWidth="0.7" strokeOpacity="0.2"/>
      {/* Head */}
      <circle cx="19" cy="7" r="3" fill={c}/>
      {/* Full helmet */}
      <path d="M15.5,7 Q19,2.5 22.5,7" fill={c}/>
      {/* Majestic plume */}
      <path d="M16,5 Q19,1.5 22,5" fill="#ef4444"/>
      {/* Gladius raised */}
      <line x1="22" y1="12" x2="31" y2="7.5" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="31" y1="7.5" x2="33" y2="5.5" stroke="#bbbbbb" strokeWidth="2" strokeLinecap="round"/>
      {/* Legs */}
      <line x1="18" y1="20" x2="16" y2="30" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="20.5" y1="20" x2="22.5" y2="30" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      {/* Gold greave bands */}
      <line x1="14.5" y1="25" x2="18" y2="25" stroke="#c9a84c" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="20" y1="25" x2="23.5" y2="25" stroke="#c9a84c" strokeWidth="1" strokeOpacity="0.6"/>
    </g>
  );
}
