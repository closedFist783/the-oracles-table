// ── Full D&D 5e Class Data ────────────────────────────────────────────────────

export const HIT_DICE = {
  Barbarian:12, Fighter:10, Paladin:10, Ranger:10,
  Bard:8, Cleric:8, Druid:8, Monk:8, Rogue:8, Warlock:8,
  Sorcerer:6, Wizard:6,
}

// Proficiency bonus by level
export function profBonus(level) { return Math.floor((level - 1) / 4) + 2 }

// XP thresholds per level
export const XP_THRESHOLDS = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000]
export function xpToLevel(xp) {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--)
    if (xp >= XP_THRESHOLDS[i]) return i + 1
  return 1
}
export function xpForNextLevel(level) { return XP_THRESHOLDS[Math.min(level, 19)] }
export function xpProgress(xp, level) {
  const cur = XP_THRESHOLDS[level - 1] ?? 0
  const nxt = XP_THRESHOLDS[level] ?? XP_THRESHOLDS[19]
  return Math.min(1, (xp - cur) / (nxt - cur))
}

// ── Spell slot tables by class level ─────────────────────────────────────────
const FULL_CASTER_SLOTS = {
  1:[2], 2:[3], 3:[4,2], 4:[4,3], 5:[4,3,2], 6:[4,3,3], 7:[4,3,3,1],
  8:[4,3,3,2], 9:[4,3,3,3,1], 10:[4,3,3,3,2], 11:[4,3,3,3,2,1],
  12:[4,3,3,3,2,1], 13:[4,3,3,3,2,1,1], 14:[4,3,3,3,2,1,1],
  15:[4,3,3,3,2,1,1,1], 16:[4,3,3,3,2,1,1,1], 17:[4,3,3,3,2,1,1,1,1],
  18:[4,3,3,3,3,1,1,1,1], 19:[4,3,3,3,3,2,1,1,1], 20:[4,3,3,3,3,2,2,1,1],
}
const HALF_CASTER_SLOTS = { // Paladin/Ranger (starts at level 2)
  1:[], 2:[2], 3:[3], 4:[3], 5:[4,2], 6:[4,2], 7:[4,3], 8:[4,3],
  9:[4,3,2], 10:[4,3,2], 11:[4,3,3], 12:[4,3,3], 13:[4,3,3,1],
  14:[4,3,3,1], 15:[4,3,3,2], 16:[4,3,3,2], 17:[4,3,3,3,1],
  18:[4,3,3,3,1], 19:[4,3,3,3,2], 20:[4,3,3,3,2],
}
const WARLOCK_SLOTS = {
  1:[1], 2:[2], 3:[2], 4:[2], 5:[2], 6:[2], 7:[2], 8:[2],
  9:[2], 10:[2], 11:[3], 12:[3], 13:[3], 14:[3], 15:[3],
  16:[3], 17:[4], 18:[4], 19:[4], 20:[4],
}
const WARLOCK_SLOT_LEVEL = [0,1,1,2,2,3,3,4,4,5,5,5,5,5,5,5,5,5,5,5,5]

export function spellSlots(cls, level) {
  if (['Bard','Cleric','Druid','Sorcerer','Wizard'].includes(cls)) return FULL_CASTER_SLOTS[level] ?? []
  if (['Paladin','Ranger'].includes(cls)) return HALF_CASTER_SLOTS[level] ?? []
  if (cls === 'Warlock') return WARLOCK_SLOTS[level] ?? []
  return []
}

// ── Feature definitions ───────────────────────────────────────────────────────
// Each feature: { name, desc, buff }
// Each level entry: { features[], choices[]? }
// Choice types: 'asi', 'subclass', 'fighting_style', 'spells'

const SUBCLASSES = {
  Barbarian: ['Path of the Berserker','Path of the Totem Warrior','Path of the Ancestral Guardian','Path of the Storm Herald'],
  Bard:      ['College of Lore','College of Valor','College of Glamour','College of Swords'],
  Cleric:    ['Life Domain','Light Domain','Trickery Domain','War Domain','Knowledge Domain','Nature Domain','Tempest Domain'],
  Druid:     ['Circle of the Land','Circle of the Moon','Circle of the Shepherd','Circle of Spores'],
  Fighter:   ['Champion','Battle Master','Eldritch Knight','Arcane Archer','Cavalier','Echo Knight'],
  Monk:      ['Way of the Open Hand','Way of Shadow','Way of the Four Elements','Way of the Drunken Master','Way of the Kensei'],
  Paladin:   ['Oath of Devotion','Oath of the Ancients','Oath of Vengeance','Oath of Conquest','Oath of Redemption'],
  Ranger:    ['Hunter','Beast Master','Gloom Stalker','Horizon Walker','Monster Slayer'],
  Rogue:     ['Thief','Assassin','Arcane Trickster','Inquisitive','Mastermind','Scout','Swashbuckler'],
  Sorcerer:  ['Draconic Bloodline','Wild Magic','Divine Soul','Shadow Magic','Storm Sorcery'],
  Warlock:   ['The Fiend','The Great Old One','The Archfey','The Celestial','The Hexblade'],
  Wizard:    ['School of Evocation','School of Abjuration','School of Conjuration','School of Divination','School of Enchantment','School of Illusion','School of Necromancy','School of Transmutation'],
}

export { SUBCLASSES }

export const CLASS_LEVELS = {

  Barbarian: {
    savingThrows: ['str','con'],
    skills: { count:2, from:['Animal Handling','Athletics','Intimidation','Nature','Perception','Survival'] },
    1:  { features:[{name:'Rage',desc:'Enter a rage as a bonus action. +2 damage on STR attacks, resistance to B/P/S damage, advantage on STR checks. 2 uses, recharges on long rest.',buff:'2 rages/day; +2 dmg; B/P/S resistance; adv STR checks'},{name:'Unarmored Defense',desc:'While not wearing armor, your AC equals 10 + DEX modifier + CON modifier.',buff:'AC = 10+DEX+CON when unarmored'}] },
    2:  { features:[{name:'Reckless Attack',desc:'When you make your first attack on your turn, you can decide to attack recklessly. You gain advantage on melee weapon attack rolls using STR this turn, but attackers have advantage on you until next turn.',buff:'Adv on STR melee attacks; attackers gain adv on you'},{name:'Danger Sense',desc:'You have advantage on DEX saving throws against effects you can see.',buff:'Adv on DEX saves vs visible effects'}] },
    3:  { features:[{name:'Primal Path',desc:'You choose a subclass that shapes your barbarian features.',buff:'Subclass chosen'}], choices:[{type:'subclass'}] },
    4:  { features:[], choices:[{type:'asi'}] },
    5:  { features:[{name:'Extra Attack',desc:'You can attack twice, instead of once, when you take the Attack action.',buff:'2 attacks per Attack action'},{name:'Fast Movement',desc:'Your speed increases by 10 feet while you aren\'t wearing heavy armor.',buff:'+10 ft movement speed (no heavy armor)'}] },
    6:  { features:[{name:'Path Feature',desc:'Feature from your Primal Path subclass.',buff:'Subclass feature'}] },
    7:  { features:[{name:'Feral Instinct',desc:'Your instincts are so honed that you have advantage on initiative rolls. If you are surprised at the beginning of combat and not incapacitated, you can act normally on your first turn.',buff:'Adv on initiative; act on surprise round'}] },
    8:  { features:[], choices:[{type:'asi'}] },
    9:  { features:[{name:'Brutal Critical (1 die)',desc:'You can roll one additional weapon damage die when determining extra damage for a critical hit.',buff:'+1 damage die on critical hits'}] },
    10: { features:[{name:'Path Feature',desc:'Feature from your Primal Path subclass.',buff:'Subclass feature'}] },
    11: { features:[{name:'Relentless Rage',desc:'If you drop to 0 HP while raging, you can make a DC 10 CON saving throw. On success, you drop to 1 HP instead. DC increases by 5 each time this occurs until you finish a short or long rest.',buff:'DC 10 CON save to drop to 1 HP instead of 0 while raging'}] },
    12: { features:[], choices:[{type:'asi'}] },
    13: { features:[{name:'Brutal Critical (2 dice)',desc:'You can roll two additional weapon damage dice on critical hits.',buff:'+2 damage dice on critical hits'}] },
    14: { features:[{name:'Path Feature',desc:'Feature from your Primal Path subclass.',buff:'Subclass feature'}] },
    15: { features:[{name:'Persistent Rage',desc:'Your rage is so fierce that it ends early only if you fall unconscious or choose to end it.',buff:'Rage only ends on unconsciousness or choice'}] },
    16: { features:[], choices:[{type:'asi'}] },
    17: { features:[{name:'Brutal Critical (3 dice)',desc:'You can roll three additional weapon damage dice on critical hits.',buff:'+3 damage dice on critical hits'}] },
    18: { features:[{name:'Indomitable Might',desc:'If your total for a STR check is less than your STR score, use the score.',buff:'STR checks minimum = STR score'}] },
    19: { features:[], choices:[{type:'asi'}] },
    20: { features:[{name:'Primal Champion',desc:'Your STR and CON each increase by 4. Your maximum for those scores is now 24.',buff:'+4 STR, +4 CON; max 24 for each'}] },
  },

  Bard: {
    savingThrows: ['dex','cha'],
    skills: { count:3, from:['Any'] },
    spellcasting: 'full',
    1:  { features:[{name:'Spellcasting',desc:'You are a full spellcaster using Charisma. You know 2 cantrips and 4 spells at level 1.',buff:'CHA spellcasting; 2 cantrips; 4 spells known'},{name:'Bardic Inspiration',desc:'As a bonus action, grant a creature within 60 ft a Bardic Inspiration die (d6) to add to one ability check, attack roll, or saving throw within 10 minutes. CHA modifier uses per long rest.',buff:'Bonus action; 1d6 inspiration; CHA mod uses/long rest'}] },
    2:  { features:[{name:'Jack of All Trades',desc:'Add half your proficiency bonus (rounded down) to any ability check you aren\'t proficient in.',buff:'+½ prof bonus to non-proficient checks'},{name:'Song of Rest',desc:'During a short rest, you can use soothing music. Creatures who spend HD regain extra 1d6 HP.',buff:'Short rest: creatures regain extra 1d6 HP'}] },
    3:  { features:[{name:'Bard College',desc:'You join a college that grants subclass features.',buff:'Subclass chosen'},{name:'Expertise',desc:'Choose 2 proficiencies. Your proficiency bonus is doubled for those checks.',buff:'Double prof bonus for 2 chosen skills'}], choices:[{type:'subclass'}] },
    4:  { features:[], choices:[{type:'asi'}] },
    5:  { features:[{name:'Bardic Inspiration (d8)',desc:'Your Bardic Inspiration die becomes a d8.',buff:'Bardic Inspiration upgrades to 1d8'},{name:'Font of Inspiration',desc:'You regain all your Bardic Inspiration uses when you finish a short or long rest.',buff:'Bardic Inspiration recharges on short rest'}] },
    6:  { features:[{name:'Countercharm',desc:'You can use musical performance to counter charm and fear effects for nearby allies.',buff:'Action to give nearby allies adv on saves vs charm/fear'},{name:'Bard College Feature',desc:'Feature from your Bard College subclass.',buff:'Subclass feature'}] },
    7:  { features:[] },
    8:  { features:[], choices:[{type:'asi'}] },
    9:  { features:[{name:'Song of Rest (d8)',desc:'Your Song of Rest die becomes d8.',buff:'Song of Rest upgrades to 1d8'}] },
    10: { features:[{name:'Bardic Inspiration (d10)',desc:'Your Bardic Inspiration die becomes a d10.',buff:'Bardic Inspiration upgrades to 1d10'},{name:'Expertise (2 more)',desc:'Choose 2 more proficiencies to double.',buff:'Double prof bonus for 2 more skills'},{name:'Magical Secrets',desc:'Choose 2 spells from any class spell list.',buff:'Learn 2 spells from any class list'}] },
    11: { features:[{name:'Song of Rest (d10)',desc:'Your Song of Rest die becomes d10.',buff:'Song of Rest upgrades to 1d10'}] },
    12: { features:[], choices:[{type:'asi'}] },
    13: { features:[{name:'Song of Rest (d12)',desc:'Your Song of Rest die becomes d12.',buff:'Song of Rest upgrades to 1d12'}] },
    14: { features:[{name:'Magical Secrets (2 more)',desc:'Choose 2 more spells from any class list.',buff:'Learn 2 more spells from any class list'},{name:'Bard College Feature',desc:'Feature from your Bard College subclass.',buff:'Subclass feature'}] },
    15: { features:[{name:'Bardic Inspiration (d12)',desc:'Your Bardic Inspiration die becomes a d12.',buff:'Bardic Inspiration upgrades to 1d12'}] },
    16: { features:[], choices:[{type:'asi'}] },
    17: { features:[{name:'Song of Rest (d12+)',desc:'Creatures regain the maximum number on the die.',buff:'Song of Rest: max HP restored'}] },
    18: { features:[{name:'Magical Secrets (2 more)',desc:'Choose 2 more spells from any class list.',buff:'Learn 2 more spells from any class list'}] },
    19: { features:[], choices:[{type:'asi'}] },
    20: { features:[{name:'Superior Inspiration',desc:'If you have no Bardic Inspiration uses left when you roll initiative, you regain one use.',buff:'Regain 1 Bardic Inspiration on initiative if empty'}] },
  },

  Cleric: {
    savingThrows: ['wis','cha'],
    skills: { count:2, from:['History','Insight','Medicine','Persuasion','Religion'] },
    spellcasting: 'full',
    1:  { features:[{name:'Spellcasting',desc:'You are a full spellcaster using Wisdom. You prepare cleric spells each day.',buff:'WIS spellcasting; prepare (level+WIS mod) spells/day'},{name:'Divine Domain',desc:'You choose a domain that defines your cleric powers.',buff:'Subclass chosen at level 1'}], choices:[{type:'subclass'}] },
    2:  { features:[{name:'Channel Divinity (1/rest)',desc:'Use your Channel Divinity power. You know Turn Undead plus a domain power. Once per short or long rest.',buff:'1 use/rest; Turn Undead + domain power'},{name:'Domain Feature',desc:'Feature from your Divine Domain.',buff:'Domain feature'}] },
    3:  { features:[] },
    4:  { features:[], choices:[{type:'asi'}] },
    5:  { features:[{name:'Destroy Undead (CR ½)',desc:'When you use Turn Undead, undead of CR ½ or lower are instantly destroyed.',buff:'Turn Undead destroys CR ½ or lower undead'}] },
    6:  { features:[{name:'Channel Divinity (2/rest)',desc:'You can use Channel Divinity twice per short or long rest.',buff:'2 Channel Divinity uses/rest'},{name:'Domain Feature',desc:'Feature from your Divine Domain.',buff:'Domain feature'}] },
    7:  { features:[] },
    8:  { features:[{name:'Destroy Undead (CR 1)',desc:'Turn Undead now destroys CR 1 or lower undead.',buff:'Turn Undead destroys CR 1 or lower undead'},{name:'Domain Feature',desc:'Feature from your Divine Domain.',buff:'Domain feature'}], choices:[{type:'asi'}] },
    9:  { features:[] },
    10: { features:[{name:'Divine Intervention',desc:'You can call on your deity for miraculous aid. Roll d100; if you roll equal to or less than your cleric level, the deity intervenes.',buff:'1/week; d100 ≤ level = divine miracle'}] },
    11: { features:[{name:'Destroy Undead (CR 2)',desc:'Turn Undead now destroys CR 2 or lower undead.',buff:'Turn Undead destroys CR 2 or lower'}] },
    12: { features:[], choices:[{type:'asi'}] },
    13: { features:[] },
    14: { features:[{name:'Destroy Undead (CR 3)',desc:'Turn Undead now destroys CR 3 or lower undead.',buff:'Turn Undead destroys CR 3 or lower'}] },
    15: { features:[] },
    16: { features:[], choices:[{type:'asi'}] },
    17: { features:[{name:'Destroy Undead (CR 4)',desc:'Turn Undead now destroys CR 4 or lower undead.',buff:'Turn Undead destroys CR 4 or lower'},{name:'Domain Feature',desc:'Capstone domain feature.',buff:'Domain capstone feature'}] },
    18: { features:[{name:'Channel Divinity (3/rest)',desc:'You can use Channel Divinity three times per short or long rest.',buff:'3 Channel Divinity uses/rest'}] },
    19: { features:[], choices:[{type:'asi'}] },
    20: { features:[{name:'Divine Intervention (Improved)',desc:'Your call for intervention succeeds automatically, no roll needed.',buff:'Divine Intervention succeeds automatically; 1/week'}] },
  },

  Druid: {
    savingThrows: ['int','wis'],
    skills: { count:2, from:['Arcana','Animal Handling','Insight','Medicine','Nature','Perception','Religion','Survival'] },
    spellcasting: 'full',
    1:  { features:[{name:'Spellcasting',desc:'You are a full spellcaster using Wisdom. You prepare druid spells each day.',buff:'WIS spellcasting; prepare (level+WIS mod) spells/day'},{name:'Druidic',desc:'You know Druidic, a secret language. You can leave and notice hidden messages in nature.',buff:'Secret language; hidden nature messages'}] },
    2:  { features:[{name:'Wild Shape (CR ¼)',desc:'You can use your action to magically assume the shape of a beast you have seen before (CR ¼ or lower, no flying or swimming speed). Twice per short rest.',buff:'2/short rest; beast up to CR ¼; no fly/swim'},{name:'Druid Circle',desc:'You choose a circle that defines your druid powers.',buff:'Subclass chosen'}], choices:[{type:'subclass'}] },
    3:  { features:[] },
    4:  { features:[{name:'Wild Shape (CR ½)',desc:'You can now Wild Shape into beasts of CR ½ or lower. No flying speed.',buff:'Wild Shape up to CR ½; no fly'},{name:'Wild Shape Improvement',desc:'See above.',buff:''}], choices:[{type:'asi'}] },
    5:  { features:[] },
    6:  { features:[{name:'Circle Feature',desc:'Feature from your Druid Circle subclass.',buff:'Subclass feature'}] },
    7:  { features:[] },
    8:  { features:[{name:'Wild Shape (CR 1)',desc:'You can now Wild Shape into beasts of CR 1 or lower. Flying speed unlocked.',buff:'Wild Shape up to CR 1; fly speed unlocked'}], choices:[{type:'asi'}] },
    9:  { features:[] },
    10: { features:[{name:'Circle Feature',desc:'Feature from your Druid Circle subclass.',buff:'Subclass feature'}] },
    12: { features:[], choices:[{type:'asi'}] },
    14: { features:[{name:'Circle Feature',desc:'Feature from your Druid Circle subclass.',buff:'Subclass feature'}] },
    16: { features:[], choices:[{type:'asi'}] },
    18: { features:[{name:'Timeless Body',desc:'The primal magic that you wield causes you to age more slowly. For every 10 years, your body ages only 1 year.',buff:'Age 1 year per 10 years'},{name:'Beast Spells',desc:'You can cast spells while in Wild Shape form.',buff:'Cast spells while Wild Shape active'}] },
    19: { features:[], choices:[{type:'asi'}] },
    20: { features:[{name:'Archdruid',desc:'You can use Wild Shape an unlimited number of times.',buff:'Unlimited Wild Shape uses'}] },
  },

  Fighter: {
    savingThrows: ['str','con'],
    skills: { count:2, from:['Acrobatics','Animal Handling','Athletics','History','Insight','Intimidation','Perception','Survival'] },
    1:  { features:[{name:'Fighting Style',desc:'Adopt a particular style of fighting as your specialty.',buff:'Style chosen'},{name:'Second Wind',desc:'As a bonus action, regain 1d10 + fighter level HP. Once per short rest.',buff:'Bonus action: regain 1d10+level HP; 1/short rest'}], choices:[{type:'fighting_style',options:['Archery (+2 ranged attack rolls)','Defense (+1 AC while armored)','Dueling (+2 damage with one-handed weapon)','Great Weapon Fighting (reroll 1s and 2s on two-handed damage)','Protection (impose disadvantage on attacks against allies)','Two-Weapon Fighting (add ability modifier to off-hand attacks)']}] },
    2:  { features:[{name:'Action Surge (1/rest)',desc:'On your turn, you can take one additional action. Once per short rest.',buff:'1/short rest: take an extra action'}] },
    3:  { features:[{name:'Martial Archetype',desc:'You choose a martial archetype that defines your combat approach.',buff:'Subclass chosen'}], choices:[{type:'subclass'}] },
    4:  { features:[], choices:[{type:'asi'}] },
    5:  { features:[{name:'Extra Attack',desc:'You can attack twice whenever you take the Attack action.',buff:'2 attacks per Attack action'}] },
    6:  { features:[], choices:[{type:'asi'}] },
    7:  { features:[{name:'Archetype Feature',desc:'Feature from your Martial Archetype subclass.',buff:'Subclass feature'}] },
    8:  { features:[], choices:[{type:'asi'}] },
    9:  { features:[{name:'Indomitable (1/long rest)',desc:'You can reroll a saving throw you fail. You must use the new roll. Once per long rest.',buff:'1/long rest: reroll a failed save'}] },
    10: { features:[{name:'Archetype Feature',desc:'Feature from your Martial Archetype subclass.',buff:'Subclass feature'}] },
    11: { features:[{name:'Extra Attack (3)',desc:'You can attack three times whenever you take the Attack action.',buff:'3 attacks per Attack action'}] },
    12: { features:[], choices:[{type:'asi'}] },
    13: { features:[{name:'Indomitable (2/long rest)',desc:'You can use Indomitable twice per long rest.',buff:'2/long rest: reroll failed saves'}] },
    14: { features:[], choices:[{type:'asi'}] },
    15: { features:[{name:'Archetype Feature',desc:'Feature from your Martial Archetype subclass.',buff:'Subclass feature'}] },
    16: { features:[], choices:[{type:'asi'}] },
    17: { features:[{name:'Action Surge (2/rest)',desc:'You can use Action Surge twice per short rest.',buff:'2/short rest: take extra action'},{name:'Indomitable (3/long rest)',desc:'You can use Indomitable three times per long rest.',buff:'3/long rest: reroll failed saves'}] },
    18: { features:[{name:'Archetype Feature',desc:'Feature from your Martial Archetype subclass.',buff:'Subclass feature'}] },
    19: { features:[], choices:[{type:'asi'}] },
    20: { features:[{name:'Extra Attack (4)',desc:'You can attack four times whenever you take the Attack action.',buff:'4 attacks per Attack action'}] },
  },

  Monk: {
    savingThrows: ['str','dex'],
    skills: { count:2, from:['Acrobatics','Athletics','History','Insight','Religion','Stealth'] },
    1:  { features:[{name:'Unarmored Defense',desc:'While not wearing armor or shield, your AC equals 10 + DEX modifier + WIS modifier.',buff:'AC = 10+DEX+WIS when unarmored'},{name:'Martial Arts',desc:'Your unarmed strikes use DEX or STR modifier. Unarmed strike die: 1d4. After attacking with a monk weapon, make one unarmed strike as a bonus action.',buff:'1d4 unarmed; DEX or STR modifier; bonus unarmed after attack'}] },
    2:  { features:[{name:'Ki (2 points)',desc:'Your training allows you to harness the mystic energy of ki. Ki points: 2. Recharges on short rest. Flurry of Blows (1 ki: two unarmed strikes as bonus action), Patient Defense (1 ki: Dodge as bonus action), Step of the Wind (1 ki: Disengage/Dash as bonus action).',buff:'2 ki/short rest; Flurry of Blows; Patient Defense; Step of Wind'},{name:'Unarmored Movement (+10)',desc:'Your speed increases by 10 feet while not wearing armor or shield.',buff:'+10 ft speed unarmored'}] },
    3:  { features:[{name:'Monastic Tradition',desc:'You commit to a monastic tradition.',buff:'Subclass chosen'},{name:'Deflect Missiles',desc:'You can use your reaction to deflect or catch ranged weapon attacks. Reduce damage by 1d10+DEX+level. If reduced to 0, catch it and throw it back.',buff:'Reaction: reduce ranged damage 1d10+DEX+level'}], choices:[{type:'subclass'}] },
    4:  { features:[{name:'Slow Fall',desc:'As a reaction, reduce falling damage by 5 × monk level.',buff:'Reaction: reduce fall damage by 5×level'}], choices:[{type:'asi'}] },
    5:  { features:[{name:'Extra Attack',desc:'You can attack twice when you take the Attack action.',buff:'2 attacks per Attack action'},{name:'Stunning Strike',desc:'When you hit with a melee attack, spend 1 ki. Target must CON save (DC 8+prof+WIS) or be stunned until end of your next turn.',buff:'1 ki: hit → CON save or stunned (DC 8+prof+WIS)'}] },
    6:  { features:[{name:'Ki-Empowered Strikes',desc:'Your unarmed strikes count as magical for purposes of overcoming resistance.',buff:'Unarmed strikes count as magical'},{name:'Tradition Feature',desc:'Feature from your Monastic Tradition.',buff:'Subclass feature'},{name:'Unarmored Movement (+15)',desc:'Your speed increases by 15 feet while unarmored.',buff:'+15 ft speed unarmored'}] },
    7:  { features:[{name:'Evasion',desc:'When subjected to an effect that allows a DEX save for half damage, take no damage on success and half on failure.',buff:'DEX saves: no damage on success, half on failure'},{name:'Stillness of Mind',desc:'As an action, end one charm or fear effect on yourself.',buff:'Action: remove charm or fear'}] },
    8:  { features:[], choices:[{type:'asi'}] },
    9:  { features:[{name:'Unarmored Movement (improved)',desc:'You can move along vertical surfaces and across liquids without falling during your turn.',buff:'Move on vertical surfaces and water'}] },
    10: { features:[{name:'Purity of Body',desc:'Your mastery of ki grants immunity to disease and poison.',buff:'Immune to disease and poison'},{name:'Unarmored Movement (+20)',desc:'Speed increases by 20 feet unarmored.',buff:'+20 ft speed unarmored'}] },
    11: { features:[{name:'Tradition Feature',desc:'Feature from your Monastic Tradition.',buff:'Subclass feature'}] },
    12: { features:[], choices:[{type:'asi'}] },
    13: { features:[{name:'Tongue of the Sun and Moon',desc:'You understand all spoken languages. Any creature that can speak understands you.',buff:'Speak and understand all languages'}] },
    14: { features:[{name:'Diamond Soul',desc:'Proficiency in all saving throws. Spend 1 ki to reroll a failed save.',buff:'Prof in all saves; 1 ki to reroll failed save'}] },
    15: { features:[{name:'Timeless Body',desc:'You need no food, water, or air. You age 1 year per 100 years.',buff:'No sustenance needed; age slowly'}] },
    16: { features:[], choices:[{type:'asi'}] },
    17: { features:[{name:'Tradition Feature',desc:'Capstone tradition feature.',buff:'Subclass capstone feature'}] },
    18: { features:[{name:'Empty Body',desc:'Spend 4 ki for invisibility + resistance to all but force for 1 min. Spend 8 ki for Astral Projection.',buff:'4 ki: invisibility+resistance 1 min; 8 ki: astral projection'}] },
    19: { features:[], choices:[{type:'asi'}] },
    20: { features:[{name:'Perfect Self',desc:'When you roll initiative with 0 ki points remaining, you regain 4 ki points.',buff:'Regain 4 ki on initiative when empty'}] },
  },

  Paladin: {
    savingThrows: ['wis','cha'],
    skills: { count:2, from:['Athletics','Insight','Intimidation','Medicine','Persuasion','Religion'] },
    spellcasting: 'half',
    1:  { features:[{name:'Divine Sense',desc:'As an action, know the location of celestials, fiends, and undead within 60 ft (not behind total cover) until end of next turn. CHA mod + 1 uses per long rest.',buff:'Action: detect celestials/fiends/undead 60 ft; (CHA+1)/day'},{name:'Lay on Hands',desc:'A pool of HP equal to 5 × paladin level. As an action, touch a creature to restore any number of HP from pool, or expend 5 HP to cure one disease or poison. Refreshes on long rest.',buff:'HP pool = 5×level; touch to heal or cure disease/poison'}] },
    2:  { features:[{name:'Fighting Style',desc:'Adopt a fighting style specialty.',buff:'Style chosen'},{name:'Spellcasting',desc:'You are a half-caster using Charisma. Spell slots begin at level 2.',buff:'CHA spellcasting; half-caster slots from level 2'},{name:'Divine Smite',desc:'When you hit with a melee weapon attack, expend a spell slot to deal radiant damage: 2d8 for 1st-level slot, +1d8 per slot level above 1st (max 5d8). +1d8 vs undead/fiends.',buff:'On hit: expend slot → 2d8+ radiant; +1d8/slot level above 1st'}], choices:[{type:'fighting_style',options:['Defense (+1 AC while armored)','Dueling (+2 damage one-handed)','Great Weapon Fighting (reroll 1s/2s on two-handed)','Protection (impose disadvantage on attacks vs allies)']}] },
    3:  { features:[{name:'Sacred Oath',desc:'You swear a sacred oath that defines your paladin path.',buff:'Subclass chosen'},{name:'Divine Health',desc:'The divine magic flowing through you makes you immune to disease.',buff:'Immune to disease'}], choices:[{type:'subclass'}] },
    4:  { features:[], choices:[{type:'asi'}] },
    5:  { features:[{name:'Extra Attack',desc:'You can attack twice on the Attack action.',buff:'2 attacks per Attack action'}] },
    6:  { features:[{name:'Aura of Protection',desc:'Whenever you or a friendly creature within 10 feet makes a saving throw, the creature gains a bonus equal to your CHA modifier (min +1). You must be conscious.',buff:'10 ft aura: +CHA mod to all saving throws (you+allies)'}] },
    7:  { features:[{name:'Oath Feature',desc:'Feature from your Sacred Oath subclass.',buff:'Subclass feature'}] },
    8:  { features:[], choices:[{type:'asi'}] },
    9:  { features:[] },
    10: { features:[{name:'Aura of Courage',desc:'You and friendly creatures within 10 ft can\'t be frightened while you are conscious.',buff:'10 ft aura: immune to frightened condition'}] },
    11: { features:[{name:'Improved Divine Smite',desc:'Your melee weapon attacks deal an extra 1d8 radiant damage.',buff:'+1d8 radiant on all melee weapon attacks'}] },
    12: { features:[], choices:[{type:'asi'}] },
    14: { features:[{name:'Cleansing Touch',desc:'As an action, touch a willing creature to end one spell affecting it. CHA mod uses per long rest.',buff:'Action: end spell on touched willing creature; CHA mod/day'}] },
    15: { features:[{name:'Oath Feature',desc:'Feature from your Sacred Oath subclass.',buff:'Subclass feature'}] },
    16: { features:[], choices:[{type:'asi'}] },
    18: { features:[{name:'Aura Improvements',desc:'Your Aura of Protection and Aura of Courage now extend to 30 feet.',buff:'Auras of Protection and Courage expand to 30 ft'}] },
    19: { features:[], choices:[{type:'asi'}] },
    20: { features:[{name:'Sacred Oath Capstone',desc:'Capstone feature from your Sacred Oath subclass.',buff:'Subclass capstone feature'}] },
  },

  Ranger: {
    savingThrows: ['str','dex'],
    skills: { count:3, from:['Animal Handling','Athletics','Insight','Investigation','Nature','Perception','Stealth','Survival'] },
    spellcasting: 'half',
    1:  { features:[{name:'Favored Enemy',desc:'Choose a type of favored enemy. You have advantage on Survival checks to track them and Intelligence checks to recall information about them.',buff:'Adv on tracking and lore checks vs chosen enemy type'},{name:'Natural Explorer',desc:'Choose a favored terrain type. You gain several benefits when traveling in that terrain, including doubled travel pace and no penalties for difficult terrain.',buff:'Expertise in chosen terrain; enhanced travel benefits'}] },
    2:  { features:[{name:'Fighting Style',desc:'Adopt a fighting style specialty.',buff:'Style chosen'},{name:'Spellcasting',desc:'You are a half-caster using Wisdom. Spell slots begin at level 2.',buff:'WIS spellcasting; half-caster slots from level 2'}], choices:[{type:'fighting_style',options:['Archery (+2 ranged attack rolls)','Defense (+1 AC while armored)','Dueling (+2 damage one-handed)','Two-Weapon Fighting (add ability mod to off-hand attacks)']}] },
    3:  { features:[{name:'Ranger Archetype',desc:'You choose an archetype that defines your ranger style.',buff:'Subclass chosen'},{name:'Primeval Awareness',desc:'Expend a spell slot to sense the presence of certain creature types within 1 mile (6 miles in natural terrain) for 1 minute per slot level.',buff:'Expend spell slot: sense favored enemies 1-6 miles'}], choices:[{type:'subclass'}] },
    4:  { features:[], choices:[{type:'asi'}] },
    5:  { features:[{name:'Extra Attack',desc:'You can attack twice on the Attack action.',buff:'2 attacks per Attack action'}] },
    6:  { features:[{name:'Favored Enemy (2nd)',desc:'Choose a second favored enemy type.',buff:'Second favored enemy type chosen'},{name:'Natural Explorer (2nd)',desc:'Choose a second favored terrain.',buff:'Second favored terrain chosen'}] },
    7:  { features:[{name:'Archetype Feature',desc:'Feature from your Ranger Archetype subclass.',buff:'Subclass feature'}] },
    8:  { features:[{name:'Land\'s Stride',desc:'Moving through nonmagical difficult terrain costs no extra movement. You can pass through nonmagical plants without being slowed and take no damage from them. Advantage on saves against magically created plants.',buff:'Ignore difficult terrain; pass through plants; adv vs magic plants'}], choices:[{type:'asi'}] },
    9:  { features:[] },
    10: { features:[{name:'Hide in Plain Sight',desc:'Spend 1 minute to camouflage yourself. Gain +10 to Stealth checks as long as you remain still.',buff:'+10 Stealth while still after 1 min preparation'},{name:'Natural Explorer (3rd)',desc:'Choose a third favored terrain.',buff:'Third favored terrain'}] },
    11: { features:[{name:'Archetype Feature',desc:'Feature from your Ranger Archetype subclass.',buff:'Subclass feature'}] },
    12: { features:[], choices:[{type:'asi'}] },
    14: { features:[{name:'Vanish',desc:'You can use the Hide action as a bonus action. You also can\'t be tracked by nonmagical means unless you choose to leave a trail.',buff:'Bonus action Hide; can\'t be tracked (nonmagical)'}] },
    15: { features:[{name:'Archetype Feature',desc:'Feature from your Ranger Archetype subclass.',buff:'Subclass feature'}] },
    16: { features:[], choices:[{type:'asi'}] },
    18: { features:[{name:'Feral Senses',desc:'You gain preternatural senses. You can\'t be surprised while conscious. You are aware of invisible creatures within 30 ft.',buff:'Can\'t be surprised; aware of invisible creatures 30 ft'}] },
    19: { features:[], choices:[{type:'asi'}] },
    20: { features:[{name:'Foe Slayer',desc:'Once per turn, add your WIS modifier to an attack roll or damage roll against a favored enemy.',buff:'Once/turn: +WIS mod to attack or damage vs favored enemy'}] },
  },

  Rogue: {
    savingThrows: ['dex','int'],
    skills: { count:4, from:['Acrobatics','Athletics','Deception','Insight','Intimidation','Investigation','Perception','Performance','Persuasion','Sleight of Hand','Stealth'] },
    1:  { features:[{name:'Expertise',desc:'Choose 2 skill proficiencies or thieves\' tools. Your proficiency bonus is doubled for those checks.',buff:'Double prof bonus for 2 chosen skills/tools'},{name:'Sneak Attack (1d6)',desc:'Once per turn, deal extra 1d6 damage to a creature when you have advantage on the attack or an ally is adjacent to the target.',buff:'1d6 extra damage; once/turn; needs adv or ally adjacent'},{name:'Thieves\' Cant',desc:'You know a secret mix of dialect and signs used by rogues.',buff:'Secret rogue language'}] },
    2:  { features:[{name:'Cunning Action',desc:'You can take a bonus action on each of your turns to Dash, Disengage, or Hide.',buff:'Bonus action: Dash, Disengage, or Hide'}] },
    3:  { features:[{name:'Roguish Archetype',desc:'You choose an archetype that defines your rogue style.',buff:'Subclass chosen'},{name:'Sneak Attack (2d6)',desc:'Sneak Attack upgrades to 2d6.',buff:'Sneak Attack: 2d6'}], choices:[{type:'subclass'}] },
    4:  { features:[], choices:[{type:'asi'}] },
    5:  { features:[{name:'Uncanny Dodge',desc:'When an attacker you can see hits you, use your reaction to halve the attack\'s damage.',buff:'Reaction: halve one attack\'s damage'},{name:'Sneak Attack (3d6)',desc:'Sneak Attack upgrades to 3d6.',buff:'Sneak Attack: 3d6'}] },
    6:  { features:[{name:'Expertise (2 more)',desc:'Choose 2 more proficiencies to double.',buff:'Double prof bonus for 2 more skills'},{name:'Sneak Attack (4d6)',desc:'Sneak Attack upgrades to 4d6.',buff:'Sneak Attack: 4d6'}] },
    7:  { features:[{name:'Evasion',desc:'When DEX save for half damage, take no damage on success and half on failure.',buff:'DEX saves: no damage on success'},{name:'Sneak Attack (5d6)',desc:'Sneak Attack upgrades to 5d6.',buff:'Sneak Attack: 5d6'}] },
    8:  { features:[{name:'Sneak Attack (6d6)',desc:'Sneak Attack upgrades to 6d6.',buff:'Sneak Attack: 6d6'}], choices:[{type:'asi'}] },
    9:  { features:[{name:'Archetype Feature',desc:'Feature from your Roguish Archetype.',buff:'Subclass feature'},{name:'Sneak Attack (7d6)',desc:'Sneak Attack upgrades to 7d6.',buff:'Sneak Attack: 7d6'}] },
    10: { features:[{name:'Sneak Attack (8d6)',desc:'Sneak Attack upgrades to 8d6.',buff:'Sneak Attack: 8d6'}], choices:[{type:'asi'}] },
    11: { features:[{name:'Reliable Talent',desc:'Whenever you make an ability check with a proficiency, treat any roll of 9 or lower as a 10.',buff:'Proficient ability checks: min roll of 10'},{name:'Sneak Attack (9d6)',desc:'Sneak Attack upgrades to 9d6.',buff:'Sneak Attack: 9d6'}] },
    12: { features:[{name:'Sneak Attack (10d6)',desc:'Sneak Attack upgrades to 10d6.',buff:'Sneak Attack: 10d6'}], choices:[{type:'asi'}] },
    13: { features:[{name:'Archetype Feature',desc:'Feature from your Roguish Archetype.',buff:'Subclass feature'},{name:'Sneak Attack (11d6)',desc:'Sneak Attack upgrades to 11d6.',buff:'Sneak Attack: 11d6'}] },
    14: { features:[{name:'Blindsense',desc:'If you can hear, you are aware of the location of any hidden or invisible creature within 10 ft.',buff:'Aware of hidden/invisible creatures within 10 ft'},{name:'Sneak Attack (12d6)',desc:'Sneak Attack upgrades to 12d6.',buff:'Sneak Attack: 12d6'}] },
    15: { features:[{name:'Slippery Mind',desc:'You gain proficiency in WIS saving throws.',buff:'Proficiency in WIS saving throws'},{name:'Sneak Attack (13d6)',desc:'Sneak Attack upgrades to 13d6.',buff:'Sneak Attack: 13d6'}] },
    16: { features:[{name:'Sneak Attack (14d6)',desc:'Sneak Attack upgrades to 14d6.',buff:'Sneak Attack: 14d6'}], choices:[{type:'asi'}] },
    17: { features:[{name:'Archetype Feature',desc:'Capstone archetype feature.',buff:'Subclass capstone'},{name:'Sneak Attack (15d6)',desc:'Sneak Attack upgrades to 15d6.',buff:'Sneak Attack: 15d6'}] },
    18: { features:[{name:'Elusive',desc:'No attack roll has advantage against you while you aren\'t incapacitated.',buff:'Attackers can\'t have advantage on rolls against you'},{name:'Sneak Attack (16d6)',desc:'Sneak Attack upgrades to 16d6.',buff:'Sneak Attack: 16d6'}] },
    19: { features:[{name:'Sneak Attack (17d6)',desc:'Sneak Attack upgrades to 17d6.',buff:'Sneak Attack: 17d6'}], choices:[{type:'asi'}] },
    20: { features:[{name:'Stroke of Luck',desc:'If your attack misses, you can turn the miss into a hit. If you fail an ability check, treat it as a 20. Once per short rest.',buff:'1/short rest: turn miss to hit OR failed check to 20'}] },
  },

  Sorcerer: {
    savingThrows: ['con','cha'],
    skills: { count:2, from:['Arcana','Deception','Insight','Intimidation','Persuasion','Religion'] },
    spellcasting: 'full',
    1:  { features:[{name:'Spellcasting',desc:'You are a full spellcaster using Charisma. You know a small number of spells but can cast them more flexibly.',buff:'CHA spellcasting; 4 spells known; 2 cantrips'},{name:'Sorcerous Origin',desc:'Choose the magical source of your power.',buff:'Subclass chosen at level 1'}], choices:[{type:'subclass'}] },
    2:  { features:[{name:'Font of Magic',desc:'You have 2 sorcery points. Spend to create spell slots or fuel metamagic. Recharges on long rest.',buff:'2 sorcery points/long rest'}] },
    3:  { features:[{name:'Metamagic (2)',desc:'Choose 2 metamagic options: Careful Spell, Distant Spell, Empowered Spell, Extended Spell, Heightened Spell, Quickened Spell, Subtle Spell, Twinned Spell.',buff:'2 metamagic options chosen'}] },
    4:  { features:[], choices:[{type:'asi'}] },
    5:  { features:[] },
    6:  { features:[{name:'Sorcerous Origin Feature',desc:'Feature from your Sorcerous Origin subclass.',buff:'Subclass feature'}] },
    7:  { features:[] },
    8:  { features:[], choices:[{type:'asi'}] },
    9:  { features:[] },
    10: { features:[{name:'Metamagic (3rd option)',desc:'You learn one additional metamagic option.',buff:'3rd metamagic option'}] },
    11: { features:[] },
    12: { features:[], choices:[{type:'asi'}] },
    13: { features:[] },
    14: { features:[{name:'Sorcerous Origin Feature',desc:'Feature from your Sorcerous Origin subclass.',buff:'Subclass feature'}] },
    15: { features:[] },
    16: { features:[], choices:[{type:'asi'}] },
    17: { features:[{name:'Metamagic (4th option)',desc:'You learn one additional metamagic option.',buff:'4th metamagic option'}] },
    18: { features:[{name:'Sorcerous Origin Feature',desc:'Capstone origin feature.',buff:'Subclass capstone feature'}] },
    19: { features:[], choices:[{type:'asi'}] },
    20: { features:[{name:'Sorcerous Restoration',desc:'You regain 4 expended sorcery points whenever you finish a short rest.',buff:'Regain 4 sorcery points on short rest'}] },
  },

  Warlock: {
    savingThrows: ['wis','cha'],
    skills: { count:2, from:['Arcana','Deception','History','Intimidation','Investigation','Nature','Religion'] },
    spellcasting: 'warlock',
    1:  { features:[{name:'Otherworldly Patron',desc:'You have struck a bargain with an otherworldly being.',buff:'Subclass chosen at level 1'},{name:'Pact Magic',desc:'Your spells are powered by your patron. Warlock spell slots recharge on short rest. You know 2 spells and 2 cantrips.',buff:'Spell slots recharge on short rest; CHA spellcasting'}], choices:[{type:'subclass'}] },
    2:  { features:[{name:'Eldritch Invocations (2)',desc:'You gain 2 Eldritch Invocations — supernatural abilities from your patron (e.g., Agonizing Blast, Devil\'s Sight, Mask of Many Faces).',buff:'2 invocations chosen; customize your warlock power'}] },
    3:  { features:[{name:'Pact Boon',desc:'Your patron gives you a gift: Pact of the Blade (create a bound magic weapon), Pact of the Chain (familiar), or Pact of the Tome (Grimoire with extra cantrips).',buff:'Pact Boon chosen'}] },
    4:  { features:[], choices:[{type:'asi'}] },
    5:  { features:[{name:'Eldritch Invocations (3rd)',desc:'You learn one additional eldritch invocation.',buff:'3rd eldritch invocation'}] },
    6:  { features:[{name:'Patron Feature',desc:'Feature from your Otherworldly Patron subclass.',buff:'Subclass feature'}] },
    7:  { features:[{name:'Eldritch Invocations (4th)',desc:'You learn one additional eldritch invocation.',buff:'4th eldritch invocation'}] },
    8:  { features:[], choices:[{type:'asi'}] },
    9:  { features:[{name:'Eldritch Invocations (5th)',desc:'You learn one additional eldritch invocation.',buff:'5th eldritch invocation'}] },
    10: { features:[{name:'Patron Feature',desc:'Feature from your Otherworldly Patron subclass.',buff:'Subclass feature'}] },
    11: { features:[{name:'Mystic Arcanum (6th level)',desc:'Your patron gives you a 6th-level spell to cast once per long rest without expending a spell slot.',buff:'Cast one 6th-level spell 1/long rest for free'}] },
    12: { features:[{name:'Eldritch Invocations (6th)',desc:'You learn one additional eldritch invocation.',buff:'6th eldritch invocation'}], choices:[{type:'asi'}] },
    13: { features:[{name:'Mystic Arcanum (7th level)',desc:'Your patron gives you a 7th-level spell to cast once per long rest.',buff:'Cast one 7th-level spell 1/long rest for free'}] },
    14: { features:[{name:'Patron Feature',desc:'Capstone patron feature.',buff:'Subclass capstone feature'}] },
    15: { features:[{name:'Mystic Arcanum (8th level)',desc:'Your patron gives you an 8th-level spell to cast once per long rest.',buff:'Cast one 8th-level spell 1/long rest for free'}] },
    16: { features:[], choices:[{type:'asi'}] },
    17: { features:[{name:'Mystic Arcanum (9th level)',desc:'Your patron gives you a 9th-level spell to cast once per long rest.',buff:'Cast one 9th-level spell 1/long rest for free'}] },
    18: { features:[{name:'Eldritch Invocations (7th)',desc:'You learn one additional eldritch invocation.',buff:'7th eldritch invocation'}] },
    19: { features:[], choices:[{type:'asi'}] },
    20: { features:[{name:'Eldritch Master',desc:'You can spend 1 minute pleading with your patron to regain all expended spell slots. Once per long rest.',buff:'1/long rest: spend 1 minute to regain all spell slots'}] },
  },

  Wizard: {
    savingThrows: ['int','wis'],
    skills: { count:2, from:['Arcana','History','Insight','Investigation','Medicine','Religion'] },
    spellcasting: 'full',
    1:  { features:[{name:'Spellcasting',desc:'You are a full spellcaster using Intelligence. You have a spellbook with 6 spells at level 1 and learn 2 new spells per level.',buff:'INT spellcasting; spellbook; prepare (level+INT mod) spells/day'},{name:'Arcane Recovery',desc:'Once per day when you finish a short rest, recover spell slots totaling level/2 (rounded up). None above 5th.',buff:'1/day short rest: recover spell slots up to level/2'}] },
    2:  { features:[{name:'Arcane Tradition',desc:'You choose a school of magic to specialize in.',buff:'Subclass chosen'}], choices:[{type:'subclass'}] },
    3:  { features:[] },
    4:  { features:[], choices:[{type:'asi'}] },
    5:  { features:[] },
    6:  { features:[{name:'Arcane Tradition Feature',desc:'Feature from your Arcane Tradition subclass.',buff:'Subclass feature'}] },
    7:  { features:[] },
    8:  { features:[], choices:[{type:'asi'}] },
    9:  { features:[] },
    10: { features:[{name:'Arcane Tradition Feature',desc:'Feature from your Arcane Tradition subclass.',buff:'Subclass feature'}] },
    12: { features:[], choices:[{type:'asi'}] },
    14: { features:[{name:'Arcane Tradition Feature',desc:'Feature from your Arcane Tradition subclass.',buff:'Subclass feature'}] },
    16: { features:[], choices:[{type:'asi'}] },
    18: { features:[{name:'Spell Mastery',desc:'Choose one 1st-level and one 2nd-level spell. You can cast each at lowest level without expending a spell slot.',buff:'Cast 1 chosen 1st-level and 1 chosen 2nd-level spell at will'}] },
    19: { features:[], choices:[{type:'asi'}] },
    20: { features:[{name:'Signature Spells',desc:'Choose two 3rd-level spells. They are always prepared and can each be cast once per short rest without a spell slot.',buff:'2 chosen 3rd-level spells: always prepared; 1/short rest free'}] },
  },
}

// Get features gained when leveling from oldLevel to newLevel
export function getFeaturesForLevel(cls, level) {
  const data = CLASS_LEVELS[cls]
  if (!data) return { features: [], choices: [] }
  const entry = data[level] || {}
  return {
    features: entry.features || [],
    choices: entry.choices || [],
  }
}

// Get all features from level 1 to given level (for new characters)
export function getAllFeaturesUpToLevel(cls, level) {
  const data = CLASS_LEVELS[cls]
  if (!data) return []
  const all = []
  for (let l = 1; l <= level; l++) {
    const entry = data[l]
    if (entry?.features) all.push(...entry.features)
  }
  return all
}

// ── Subclass descriptions ─────────────────────────────────────────────────────
export const SUBCLASS_DESCRIPTIONS = {
  // Barbarian
  'Path of the Berserker':        'Go into a frenzy when you rage — make a bonus melee attack each turn, but suffer exhaustion afterward. Pure offense.',
  'Path of the Totem Warrior':    'Bond with an animal spirit (Bear, Eagle, or Wolf) for powerful passive benefits to yourself and your allies.',
  'Path of the Ancestral Guardian':'Your rage calls forth ancestral spirits that protect your allies by imposing disadvantage on enemies who attack anyone but you.',
  'Path of the Storm Herald':     'Your rage creates an aura of elemental energy (arctic, desert, or sea) that damages or buffs nearby creatures.',
  // Bard
  'College of Lore':   'Master of arcane secrets. Extra skills, magical Cutting Words to debuff enemies, and access to spells from any class list at level 6.',
  'College of Valor':  'A warrior-poet. Medium armor, shields, martial weapons, and the ability to grant allies extra attacks through your inspiration.',
  'College of Glamour':'Fey-touched charmer. Captivating Presence lets you charm crowds; Mantle of Majesty lets you command with bonus action.',
  'College of Swords': 'Blade-slinging duelist. Use your instrument as a weapon, spend Bardic Inspiration to pull off flourishes that deal extra damage.',
  // Cleric
  'Life Domain':     'The healer. Disciple of Life makes all healing spells more effective. Heavy armor, bonus heals, and a powerful Preserve Life channel.',
  'Light Domain':    'Radiant blaster. Warding Flare blinds attackers. Corona of Light eventually blinds all undead and fiends near you.',
  'Trickery Domain': 'Deceptive divine. Create duplicates of yourself, grant invisibility, and boost the Stealth and Deception of allies.',
  'War Domain':      'Divine warrior. Extra attacks, war priest martial prowess, and channel divinity to boost attack rolls. Heavy armor proficiency.',
  'Knowledge Domain':'Scholar of the gods. Temporarily gain any skill proficiency, read minds, and eventually become a master of secrets.',
  'Nature Domain':   'The druid priest. Animal friendship, heavy armor, and channel divinity to charm beasts and plants.',
  'Tempest Domain':  'Storm caller. Thunderwave and lightning strike enemies for max damage; push them with destructive wrath. Heavy armor.',
  // Druid
  'Circle of the Land': 'Mystical land-bond. Recover spell slots on short rests, gain bonus spells based on terrain, and resist exhaustion and charm.',
  'Circle of the Moon': 'Fearsome shapeshifter. Wild Shape into powerful combat beasts (CR up to your level ÷ 3) and even elementals at level 10.',
  'Circle of the Shepherd':'Guardian of beasts. Summon spirit guardians to boost summoned creatures; your summoned beasts deal more damage.',
  'Circle of Spores':   'Animate the dead with fungal growth. Halo of Spores damages nearby enemies; Symbiotic Entity temporarily boosts HP and damage.',
  // Fighter
  'Champion':          'Raw athleticism. Critical hits on 19-20, superior physical abilities, and an extra fighting style at level 10. Simple and brutal.',
  'Battle Master':     'Tactical genius. Maneuvers (Trip Attack, Precision, Riposte, etc.) with superiority dice to control and debuff enemies.',
  'Eldritch Knight':   'Sword and sorcery. Learn Abjuration and Evocation spells; bind a weapon to your hand; eventually cast spells as a bonus action.',
  'Arcane Archer':     'Magical marksman. Arcing shots, curving shots, and special arrow types (Banishing, Bursting, Grasping, Seeking) with your bow.',
  'Cavalier':          'Mounted protector. Mark and punish enemies who attack your allies; excel in defense and mounted combat.',
  'Echo Knight':       'Manifest a shadow echo of yourself to attack from, teleport to, and use as a second set of eyes.',
  // Monk
  'Way of the Open Hand':      'Pure martial arts. Flurry of Blows can knock enemies prone, push them, or prevent reactions. Eventual immunity to disease, poison, and charm.',
  'Way of Shadow':             'Ninja-style. Teleport between shadows, cast darkness and silence with ki, become invisible in dim light.',
  'Way of the Four Elements':  'Elemental bender. Spend ki to cast fire, water, earth, and air spells like Burning Hands and Wall of Water.',
  'Way of the Drunken Master': 'Unpredictable brawler. Your erratic stumbling style makes you hard to hit and lets you disengage and re-engage freely.',
  'Way of the Kensei':         'Weapon master monk. Use any weapon as a monk weapon, empower your strikes, and fire ki-infused arrows.',
  // Paladin
  'Oath of Devotion':   'The classic holy knight. Sacred Weapon glows and gets a bonus to hit; Holy Nimbus radiates sunlight that burns undead.',
  'Oath of the Ancients':'Nature-bonded knight. Aura of Warding protects against spells; Undying Sentinel keeps you on your feet when dropped to 0 HP.',
  'Oath of Vengeance':  'Relentless avenger. Vow of Enmity grants advantage on one target; Aura of Hate boosts your damage with CHA.',
  'Oath of Conquest':   'Tyrant paladin. Fear enemies, slow them, and gain bonus psychic damage from your smites.',
  'Oath of Redemption': 'Pacifist protector. Absorb damage dealt to nearby allies onto yourself; persuade enemies to surrender rather than fight.',
  // Ranger
  'Hunter':        'Versatile predator. Choose your specialty: Colossus Slayer (damage), Giant Killer (reactions), or Horde Breaker (crowd control).',
  'Beast Master':  'Bond with an animal companion that fights with you. The beast uses your bonus action and scales with your level.',
  'Gloom Stalker': 'Dungeon stalker. Invisible to darkvision; extra attack on first turn of combat; terrify enemies if they miss you.',
  'Horizon Walker':'Planar guardian. Deal force damage, teleport in combat, and eventually step between planes.',
  'Monster Slayer':'Expert hunter. Study a creature to reveal its vulnerabilities; resist its spells and counterattack when it casts.',
  // Rogue
  'Thief':            'Pure larceny. Faster Hands for bonus action item use, use magic items without requirements, and climb like a spider.',
  'Assassin':         'Lethal ambusher. Advantage on attacks against creatures who haven\'t acted; auto-crit surprised targets; forge identities.',
  'Arcane Trickster': 'Magical pickpocket. Learn Illusion and Enchantment spells; steal spells from casters; distract enemies with your familiar.',
  'Inquisitive':      'Detective rogue. Unerring Eye spots hidden things; Ear for Deceit detects lies; Insightful Fighting gets Sneak Attack without allies.',
  'Mastermind':       'Puppet master. Help allies from 30 ft away; use disguise and forgery; read enemies\' tactics in combat.',
  'Scout':            'Skirmisher. Avoid opportunity attacks at will; act before nearly everyone in the first round; get expertise in Nature and Survival.',
  'Swashbuckler':     'Charming duelist. Sneak Attack without allies (just you and one target); disengage as a bonus action; charm with Panache.',
  // Sorcerer
  'Draconic Bloodline':'Dragon ancestry. Natural armor (AC 13+DEX), wings at level 14, and bonus damage on spells matching your dragon type.',
  'Wild Magic':        'Chaos incarnate. Surge of unpredictable magic effects; bend luck to give allies advantage; eventually reroll surges.',
  'Divine Soul':       'Angelic touch. Access the full Cleric spell list on top of Sorcerer spells; sprout wings; resist magical death.',
  'Shadow Magic':      'Shadow-born. Summon a Hound of Ill Omen; see in darkness; resist death once per day; become a shadow.',
  'Storm Sorcery':     'Stormborn. +10 ft fly speed when casting; move through enemies with Tempestuous Magic; resist lightning and thunder.',
  // Warlock
  'The Fiend':        'Pact with a devil. Dark One\'s Blessing grants temp HP on kills; you get powerful Fiend spells and eventually fire immunity.',
  'The Great Old One':'Pact with an alien entity. Telepathy, detect thoughts, and eventually dominate minds. Alien flavor throughout.',
  'The Archfey':      'Pact with a fey lord. Beguile and frighten enemies; teleport when hit; eventually charm anyone who attacks you.',
  'The Celestial':    'Angelic patron. Healing Touch lets you heal with Warlock slots; gain Cleric and Druid healing spells on your list.',
  'The Hexblade':     'Pact with a sentient weapon. CHA to attack/damage with your pact weapon; Hexblade\'s Curse adds prof bonus to damage and crits on 19.',
  // Wizard
  'School of Evocation':    'Blast specialist. Sculpt spells to protect allies in AOEs; empowered evocation adds INT mod to damage; reliable crits.',
  'School of Abjuration':   'Ward master. Arcane Ward absorbs damage for you; Project Ward transfers it to allies; eventual spell immunity.',
  'School of Conjuration':  'Summoner. Minor Conjuration creates small objects; Benign Transposition teleports you or a summon; focus fire summoned creatures.',
  'School of Divination':   'Fortune-teller. Portent lets you roll dice at the start of each day and swap them for anyone\'s rolls. Extremely powerful.',
  'School of Enchantment':  'Mind-bender. Hypnotic Gaze stuns, Split Enchantment doubles charm spells, Alter Memories makes targets forget your magic.',
  'School of Illusion':     'Illusionist. Malleable Illusions change your illusions mid-scene; Illusory Self creates a decoy when hit; Illusory Reality makes one part real.',
  'School of Necromancy':   'Undead commander. Grim Harvest regains HP when you kill; raise up to 5+2×WIS undead minions; make them stronger.',
  'School of Transmutation':'Shapeshifter scholar. Minor Alchemy transforms materials; Transmuter\'s Stone grants passive buffs; Shapechanger turns you into a beast.',
}

// ── Fighting style descriptions ───────────────────────────────────────────────
export const FIGHTING_STYLE_DESCS = {
  'Archery (+2 ranged attack rolls)':                        '+2 to all ranged weapon attack rolls. The best choice for archers and crossbow users.',
  'Defense (+1 AC while armored)':                           '+1 AC whenever you\'re wearing any armor. A passive bonus to survivability no matter your playstyle.',
  'Dueling (+2 damage with one-handed weapon)':              '+2 damage when wielding a one-handed weapon with your other hand free (no shield required).',
  'Great Weapon Fighting (reroll 1s and 2s on two-handed damage)': 'Reroll 1s and 2s on damage dice when using a two-handed or versatile weapon two-handed. Must keep the new roll.',
  'Protection (impose disadvantage on attacks against allies)':'Reaction: impose disadvantage on one attack roll against an ally within 5 ft. Requires a shield.',
  'Two-Weapon Fighting (add ability modifier to off-hand attacks)': 'Add your STR or DEX modifier to off-hand attack damage. Normally off-hand attacks don\'t get this bonus.',
}

// ── D&D 5e Feat list ──────────────────────────────────────────────────────────
// prereqFn(character) → true if character meets prerequisites
const isCaster = c => ['Bard','Cleric','Druid','Paladin','Ranger','Sorcerer','Warlock','Wizard'].includes(c.class)
const hasHeavyArmor = c => ['Fighter','Paladin'].includes(c.class) || (c.class === 'Cleric')

export const FEATS = [
  { name:'Alert',            desc:'+5 to initiative. You can\'t be surprised while conscious. Other creatures don\'t gain advantage on attack rolls against you as a result of being hidden from you.' },
  { name:'Athlete',          desc:'+1 STR or DEX. Standing up from prone costs only 5 ft of movement. Climbing doesn\'t halve your speed. Running long jump requires only 5 ft run-up.' },
  { name:'Actor',            desc:'+1 CHA. Advantage on Deception and Performance when pretending to be someone else. Mimic speech or sounds of creatures you\'ve heard (DC 15 Insight to detect).' },
  { name:'Charger',          desc:'When you Dash as an action, you can make one melee weapon attack or shove as a bonus action. +5 damage if you moved 10+ ft in a straight line.' },
  { name:'Crossbow Expert',  desc:'Ignore loading on crossbows. No disadvantage on ranged attacks while in melee. When you attack with a one-handed weapon, bonus action hand crossbow attack.' },
  { name:'Defensive Duelist',desc:'+1 DEX. When hit by a melee attack while wielding a finesse weapon, use your reaction to add your proficiency bonus to AC for that attack.', prereq:'DEX 13+', prereqFn: c => (c.dex_stat??10) >= 13 },
  { name:'Dual Wielder',     desc:'+1 AC while wielding two melee weapons. Use any one-handed melee weapon for two-weapon fighting (not just light). Draw or stow two weapons at once.' },
  { name:'Dungeon Delver',   desc:'Advantage on Perception and Investigation to detect secret doors. Advantage on saves vs traps. Resistance to trap damage. Search for traps at normal pace.' },
  { name:'Durable',          desc:'+1 CON. When you roll a Hit Die to recover HP on a short rest, the minimum HP you regain equals twice your CON modifier (minimum 2).' },
  { name:'Elemental Adept',  desc:'Choose a damage type (acid, cold, fire, lightning, or thunder). Your spells ignore resistance to that type. Treat 1s on damage dice as 2s for that type.', prereq:'Spellcasting ability', prereqFn: isCaster },
  { name:'Grappler',         desc:'Advantage on attacks against creatures you\'re grappling. As an action, try to restrain a grappled creature (both of you become restrained).', prereq:'STR 13+', prereqFn: c => (c.str_stat??10) >= 13 },
  { name:'Great Weapon Master', desc:'When you score a critical hit or reduce a creature to 0 HP with a melee weapon, make one melee weapon attack as a bonus action. Before attacking with a heavy weapon, take -5 to hit for +10 damage.' },
  { name:'Healer',           desc:'Use a healer\'s kit to stabilize a creature and restore 1 HP. As an action, restore 1d6 + 4 + creature\'s max hit dice HP (once per short rest per creature).' },
  { name:'Heavily Armored',  desc:'+1 STR. Gain proficiency with heavy armor.', prereq:'Medium armor proficiency', prereqFn: c => ['Fighter','Paladin','Cleric','Ranger'].includes(c.class) },
  { name:'Heavy Armor Master',desc:'+1 STR. While wearing heavy armor, reduce non-magical bludgeoning, piercing, and slashing damage by 3.', prereq:'Heavy armor proficiency', prereqFn: hasHeavyArmor },
  { name:'Inspiring Leader', desc:'After a 10-minute speech, grant up to 6 allies temp HP equal to your level + CHA modifier. Must understand you.', prereq:'CHA 13+', prereqFn: c => (c.cha_stat??10) >= 13 },
  { name:'Keen Mind',        desc:'+1 INT. Always know which direction is north. Always know how many hours until sunrise or sunset. Recall anything you\'ve seen or heard in the past month.' },
  { name:'Lightly Armored',  desc:'+1 STR or DEX. Gain proficiency with light armor.' },
  { name:'Linguist',         desc:'+1 INT. Learn 3 languages of your choice. Create ciphers. Others need an INT check (DC = your INT score) to decode your writing.' },
  { name:'Lucky',            desc:'3 luck points per long rest. Spend one to roll an extra d20 on any attack, ability check, or save and choose which roll to use. Or force a reroll against you.' },
  { name:'Mage Slayer',      desc:'When a creature within 5 ft casts a spell, use your reaction to make a melee attack against them. Target has disadvantage on concentration saves from your damage. Advantage on saves vs nearby spells.' },
  { name:'Magic Initiate',   desc:'Choose a class. Learn 2 cantrips from that class\'s spell list. Learn 1 1st-level spell from that list, castable once per long rest (using that class\'s ability).' },
  { name:'Martial Adept',    desc:'Learn 2 maneuvers from the Battle Master archetype. Gain 1 superiority die (d6) to fuel them. Recharges on short rest.' },
  { name:'Medium Armor Master',desc:'Wearing medium armor doesn\'t impose disadvantage on Stealth. Maximum DEX bonus to AC in medium armor increases from +2 to +3.', prereq:'Medium armor proficiency' },
  { name:'Mobile',           desc:'+10 ft movement speed. When you Dash, difficult terrain doesn\'t cost extra movement. When you make a melee attack, you don\'t provoke opportunity attacks from that target for the rest of the turn.' },
  { name:'Moderately Armored',desc:'+1 STR or DEX. Gain proficiency with medium armor and shields.', prereq:'Light armor proficiency' },
  { name:'Mounted Combatant',desc:'Advantage on melee attacks vs unmounted creatures smaller than your mount. Force attacks targeting your mount to target you instead. Mount makes DEX saves with advantage.' },
  { name:'Observant',        desc:'+1 INT or WIS. Read lips. +5 to passive Perception and passive Investigation scores.' },
  { name:'Polearm Master',   desc:'After taking the Attack action with a polearm, bonus action butt-end attack (1d4 bludgeoning). Opportunity attacks when creatures enter your reach.' },
  { name:'Resilient',        desc:'+1 to a chosen ability score. Gain proficiency in saving throws using that ability.' },
  { name:'Ritual Caster',    desc:'Acquire a ritual book with two 1st-level rituals. Add rituals of any level you can cast. Cast rituals without expending spell slots (takes 10 extra minutes).', prereq:'INT or WIS 13+' },
  { name:'Savage Attacker',  desc:'Once per turn when you roll damage for a melee weapon attack, reroll the damage dice and use either result.' },
  { name:'Sentinel',         desc:'When you hit with an opportunity attack, the creature\'s speed drops to 0. Creatures provoke opportunity attacks from you even after Disengaging. React to attack creatures that attack your allies.' },
  { name:'Sharpshooter',     desc:'No disadvantage at long range. Ranged attacks ignore half cover and three-quarters cover. Before attacking, take -5 to hit for +10 damage.' },
  { name:'Shield Master',    desc:'Shove as a bonus action after the Attack action. Add your shield\'s AC bonus to DEX saves vs single-target effects. On a successful DEX save vs half damage, take none instead.' },
  { name:'Skilled',          desc:'Gain proficiency in any combination of 3 skills or tools of your choice.' },
  { name:'Skulker',          desc:'Hide when only lightly obscured. Missing with a ranged attack doesn\'t reveal your position. No disadvantage on Perception in dim light.', prereq:'DEX 13+', prereqFn: c => (c.dex_stat??10) >= 13 },
  { name:'Spell Sniper',     desc:'Double the range of spells requiring an attack roll. Spells ignore half cover and three-quarters cover. Learn 1 attack cantrip from any class.', prereq:'Spellcasting ability', prereqFn: isCaster },
  { name:'Tavern Brawler',   desc:'+1 STR or CON. Proficiency with improvised weapons. Unarmed strikes deal 1d4. When you hit with an unarmed strike or improvised weapon, bonus action grapple attempt.' },
  { name:'Tough',            desc:'HP maximum increases by 2 for each level you have and will have. (Retroactive — you gain 2 HP per level you\'ve already earned.)' },
  { name:'War Caster',       desc:'Advantage on CON saves to maintain concentration. Perform somatic components with hands full of weapons or shield. Cast a spell (instead of melee) as an opportunity attack.', prereq:'Spellcasting ability', prereqFn: isCaster },
  { name:'Weapon Master',    desc:'+1 STR or DEX. Gain proficiency with 4 weapons of your choice.' },
]
