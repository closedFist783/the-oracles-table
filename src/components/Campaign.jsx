import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { sendToGM, GM_PERSONAS } from '../lib/gm'
import { xpToLevel, xpForNextLevel, xpProgress, HIT_DICE, getFeaturesForLevel, getAllFeaturesUpToLevel, profBonus } from '../lib/classes'
import LevelUp from './LevelUp'

const STAT_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const STAT_KEYS  = ['str_stat', 'dex_stat', 'con_stat', 'int_stat', 'wis_stat', 'cha_stat']
const STAT_FULL  = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }
const STAT_KEY   = { str: 'str_stat', dex: 'dex_stat', con: 'con_stat', int: 'int_stat', wis: 'wis_stat', cha: 'cha_stat' }

const SKILLS = [
  { name: 'Acrobatics',      key: 'dex_stat', abbr: 'DEX' },
  { name: 'Animal Handling', key: 'wis_stat', abbr: 'WIS' },
  { name: 'Arcana',          key: 'int_stat', abbr: 'INT' },
  { name: 'Athletics',       key: 'str_stat', abbr: 'STR' },
  { name: 'Deception',       key: 'cha_stat', abbr: 'CHA' },
  { name: 'History',         key: 'int_stat', abbr: 'INT' },
  { name: 'Insight',         key: 'wis_stat', abbr: 'WIS' },
  { name: 'Intimidation',    key: 'cha_stat', abbr: 'CHA' },
  { name: 'Investigation',   key: 'int_stat', abbr: 'INT' },
  { name: 'Medicine',        key: 'wis_stat', abbr: 'WIS' },
  { name: 'Nature',          key: 'int_stat', abbr: 'INT' },
  { name: 'Perception',      key: 'wis_stat', abbr: 'WIS' },
  { name: 'Performance',     key: 'cha_stat', abbr: 'CHA' },
  { name: 'Persuasion',      key: 'cha_stat', abbr: 'CHA' },
  { name: 'Religion',        key: 'int_stat', abbr: 'INT' },
  { name: 'Sleight of Hand', key: 'dex_stat', abbr: 'DEX' },
  { name: 'Stealth',         key: 'dex_stat', abbr: 'DEX' },
  { name: 'Survival',        key: 'wis_stat', abbr: 'WIS' },
]

const ITEM_ICONS = { weapon: '⚔️', armor: '🛡️', spell: '📖', item: '🎒', other: '📦' }

// Standard 5e starting gear per class — seeded automatically on first adventure
const STARTING_GEAR = {
  Barbarian: [
    { name: 'Greataxe',      item_type: 'weapon', description: 'A massive two-handed axe.',          buff: '1d12 slashing, heavy, two-handed',           quantity: 1, equipped: true  },
    { name: 'Handaxe',       item_type: 'weapon', description: 'A light axe good for throwing.',     buff: '1d6 slashing, light, thrown (20/60 ft)',     quantity: 2, equipped: false },
    { name: "Explorer's Pack", item_type: 'item', description: 'Backpack with adventuring supplies.', buff: '',                                          quantity: 1, equipped: false },
  ],
  Bard: [
    { name: 'Rapier',        item_type: 'weapon', description: 'A slender thrusting blade.',         buff: '1d8 piercing, finesse',                      quantity: 1, equipped: true  },
    { name: 'Leather Armor', item_type: 'armor',  description: 'Supple leather protection.',         buff: 'AC 11 + DEX mod',                           quantity: 1, equipped: true  },
    { name: 'Lute',          item_type: 'item',   description: 'A finely crafted musical instrument.',buff: '',                                          quantity: 1, equipped: false },
    { name: "Diplomat's Pack",item_type: 'item',  description: 'Travelling supplies for a charming adventurer.', buff: '',                             quantity: 1, equipped: false },
    // Spells
    { name: 'Vicious Mockery',  item_type: 'spell', description: 'Cantrip. Unleash a string of insults laced with subtle magic.', buff: '1d4 psychic · target has disadvantage on next attack · WIS save', quantity: 1, equipped: false },
    { name: 'Minor Illusion',   item_type: 'spell', description: 'Cantrip. Create a sound or small image within 30 ft.',          buff: 'Sound or image, 1 min · INT save to disbelieve',                  quantity: 1, equipped: false },
    { name: 'Healing Word',     item_type: 'spell', description: '1st level. Speak a word of magic and restore a creature\'s vitality.', buff: '1d4 + CHA mod HP healed · bonus action · 60 ft range',   quantity: 1, equipped: false },
    { name: 'Thunderwave',      item_type: 'spell', description: '1st level. Release a wave of thunderous force from yourself.',   buff: '2d8 thunder · 15 ft cube · CON save or pushed 10 ft',             quantity: 1, equipped: false },
    { name: 'Charm Person',     item_type: 'spell', description: '1st level. Attempt to charm a humanoid you can see.',           buff: 'Target charmed 1 hour · WIS save · charmed creatures see you as friendly', quantity: 1, equipped: false },
    { name: 'Dissonant Whispers',item_type:'spell', description: '1st level. Whisper a discordant melody only one creature can hear.', buff: '3d6 psychic · WIS save or target uses reaction to flee · concentration', quantity: 1, equipped: false },
  ],
  Cleric: [
    { name: 'Mace',          item_type: 'weapon', description: 'A heavy flanged bludgeoning weapon.', buff: '1d6 bludgeoning',                          quantity: 1, equipped: true  },
    { name: 'Scale Mail',    item_type: 'armor',  description: 'Overlapping metal scales on leather.', buff: 'AC 14, medium, max DEX +2',               quantity: 1, equipped: true  },
    { name: 'Shield',        item_type: 'armor',  description: 'A sturdy wooden shield.',             buff: '+2 AC, shield',                            quantity: 1, equipped: true  },
    { name: 'Holy Symbol',   item_type: 'item',   description: 'A sacred focus for divine spellcasting.', buff: 'Required for Cleric spells',          quantity: 1, equipped: false },
    { name: "Priest's Pack", item_type: 'item',   description: 'A pack with sacred and practical supplies.', buff: '',                                  quantity: 1, equipped: false },
    // Spells
    { name: 'Sacred Flame',  item_type: 'spell', description: 'Cantrip. Flame-like radiance descends on a creature within 60 ft.', buff: '1d8 radiant · DEX save · ignores cover',                          quantity: 1, equipped: false },
    { name: 'Guidance',      item_type: 'spell', description: 'Cantrip. Touch one willing creature and bolster them.',             buff: '+1d4 to one ability check · concentration up to 1 min',           quantity: 1, equipped: false },
    { name: 'Light',         item_type: 'spell', description: 'Cantrip. Touch an object and make it glow brightly.',               buff: '20 ft bright light, 20 ft dim · 1 hour',                          quantity: 1, equipped: false },
    { name: 'Cure Wounds',   item_type: 'spell', description: '1st level. Touch a creature to restore hit points.',                buff: '1d8 + WIS mod HP healed · touch range',                           quantity: 1, equipped: false },
    { name: 'Bless',         item_type: 'spell', description: '1st level. Up to 3 creatures gain divine favor.',                  buff: '+1d4 to attack rolls and saving throws · concentration 1 min',    quantity: 1, equipped: false },
    { name: 'Shield of Faith',item_type:'spell', description: '1st level. A shimmering field surrounds a creature.',              buff: '+2 AC · concentration up to 10 min · 60 ft range',                quantity: 1, equipped: false },
  ],
  Druid: [
    { name: 'Scimitar',      item_type: 'weapon', description: 'A curved slashing blade.',           buff: '1d6 slashing, finesse, light',              quantity: 1, equipped: true  },
    { name: 'Leather Armor', item_type: 'armor',  description: 'Supple leather protection.',         buff: 'AC 11 + DEX mod',                           quantity: 1, equipped: true  },
    { name: 'Wooden Shield', item_type: 'armor',  description: 'A shield carved from sacred wood.',  buff: '+2 AC, shield',                            quantity: 1, equipped: true  },
    { name: 'Druidic Focus', item_type: 'item',   description: 'A staff or sprig for druidic magic.', buff: 'Required for Druid spells',               quantity: 1, equipped: false },
    { name: "Explorer's Pack",item_type: 'item',  description: 'Backpack with adventuring supplies.', buff: '',                                          quantity: 1, equipped: false },
    // Spells
    { name: 'Produce Flame', item_type: 'spell', description: 'Cantrip. Conjure flame in your hand to light the way or hurl it.', buff: '1d8 fire · thrown attack 30 ft · or shed light 10/20 ft',         quantity: 1, equipped: false },
    { name: 'Druidcraft',    item_type: 'spell', description: 'Cantrip. Subtle natural effects: predict weather, light a fire, create sounds.', buff: 'Utility cantrip, no damage',                       quantity: 1, equipped: false },
    { name: 'Entangle',      item_type: 'spell', description: '1st level. Grasping weeds and vines sprout from the ground.',      buff: 'STR save or restrained · 20 ft square · concentration 1 min',    quantity: 1, equipped: false },
    { name: 'Cure Wounds',   item_type: 'spell', description: '1st level. Touch a creature to restore hit points.',               buff: '1d8 + WIS mod HP healed · touch range',                           quantity: 1, equipped: false },
    { name: 'Faerie Fire',   item_type: 'spell', description: '1st level. Outline creatures in glowing light.',                   buff: 'DEX save or outlined · attackers have advantage · concentration',  quantity: 1, equipped: false },
    { name: 'Goodberry',     item_type: 'spell', description: '1st level. Create up to 10 magical berries each restoring 1 HP.', buff: '10 berries · 1 HP each · nourishment for a day',                  quantity: 1, equipped: false },
  ],
  Fighter: [
    { name: 'Longsword',     item_type: 'weapon', description: 'A reliable, well-balanced blade.',   buff: '1d8 slashing, versatile (1d10)',            quantity: 1, equipped: true  },
    { name: 'Chain Mail',    item_type: 'armor',  description: 'Interlocked metal rings providing solid protection.', buff: 'AC 16, heavy, no DEX bonus', quantity: 1, equipped: true  },
    { name: 'Shield',        item_type: 'armor',  description: 'A sturdy metal shield.',             buff: '+2 AC, shield',                            quantity: 1, equipped: true  },
    { name: 'Light Crossbow',item_type: 'weapon', description: 'A mechanical ranged weapon.',        buff: '1d8 piercing, loading, 80/320 ft',          quantity: 1, equipped: false },
    { name: 'Bolt',          item_type: 'item',   description: 'Crossbow ammunition.',               buff: '',                                          quantity: 20, equipped: false },
    { name: "Explorer's Pack",item_type: 'item',  description: 'Backpack with adventuring supplies.', buff: '',                                          quantity: 1, equipped: false },
  ],
  Monk: [
    { name: 'Shortsword',    item_type: 'weapon', description: 'A short, light blade ideal for swift strikes.', buff: '1d6 piercing, finesse, light',  quantity: 1, equipped: true  },
    { name: 'Dart',          item_type: 'weapon', description: 'Small weighted throwing darts.',    buff: '1d4 piercing, thrown (20/60 ft)',            quantity: 10, equipped: false },
    { name: "Dungeoneer's Pack",item_type:'item', description: 'Supplies suited for underground exploration.', buff: '',                                quantity: 1, equipped: false },
  ],
  Paladin: [
    { name: 'Longsword',     item_type: 'weapon', description: 'A righteous blade of justice.',     buff: '1d8 slashing, versatile (1d10)',            quantity: 1, equipped: true  },
    { name: 'Chain Mail',    item_type: 'armor',  description: 'Holy armour of interlocked rings.', buff: 'AC 16, heavy, no DEX bonus',                quantity: 1, equipped: true  },
    { name: 'Shield',        item_type: 'armor',  description: 'A blessed shield bearing a holy symbol.', buff: '+2 AC, shield',                      quantity: 1, equipped: true  },
    { name: 'Javelin',       item_type: 'weapon', description: 'A light throwing spear.',           buff: '1d6 piercing, thrown (30/120 ft)',           quantity: 5, equipped: false },
    { name: 'Holy Symbol',   item_type: 'item',   description: 'A sacred focus for divine power.',  buff: 'Required for Paladin spells',              quantity: 1, equipped: false },
  ],
  Ranger: [
    { name: 'Shortsword',    item_type: 'weapon', description: 'A short, quick blade.',             buff: '1d6 piercing, finesse, light',              quantity: 2, equipped: true  },
    { name: 'Longbow',       item_type: 'weapon', description: 'A powerful ranged weapon.',         buff: '1d8 piercing, two-handed, 150/600 ft',      quantity: 1, equipped: false },
    { name: 'Arrow',         item_type: 'item',   description: 'Standard arrows for a longbow.',    buff: '',                                          quantity: 20, equipped: false },
    { name: 'Scale Mail',    item_type: 'armor',  description: 'Overlapping metal scales.',         buff: 'AC 14, medium, max DEX +2',                 quantity: 1, equipped: true  },
    { name: "Explorer's Pack",item_type: 'item',  description: 'Backpack with adventuring supplies.', buff: '',                                          quantity: 1, equipped: false },
  ],
  Rogue: [
    { name: 'Rapier',        item_type: 'weapon', description: 'Quick and deadly for sneak attacks.', buff: '1d8 piercing, finesse',                  quantity: 1, equipped: true  },
    { name: 'Shortbow',      item_type: 'weapon', description: 'A ranged bow for swift strikes.',   buff: '1d6 piercing, two-handed, 80/320 ft',       quantity: 1, equipped: false },
    { name: 'Arrow',         item_type: 'item',   description: 'Standard arrows.',                  buff: '',                                          quantity: 20, equipped: false },
    { name: 'Dagger',        item_type: 'weapon', description: 'A small concealable blade.',        buff: '1d4 piercing, finesse, light, thrown (20/60 ft)', quantity: 2, equipped: false },
    { name: 'Leather Armor', item_type: 'armor',  description: 'Lightweight protective leather.',   buff: 'AC 11 + DEX mod',                           quantity: 1, equipped: true  },
    { name: "Thieves' Tools",item_type: 'item',   description: 'Tools for picking locks and disabling traps.', buff: 'Required for lockpicking',      quantity: 1, equipped: false },
    { name: "Burglar's Pack",item_type: 'item',   description: 'Supplies for stealth and burglary.', buff: '',                                          quantity: 1, equipped: false },
  ],
  Sorcerer: [
    { name: 'Dagger',        item_type: 'weapon', description: 'A simple backup weapon.',           buff: '1d4 piercing, finesse, light, thrown (20/60 ft)', quantity: 2, equipped: true  },
    { name: 'Light Crossbow',item_type: 'weapon', description: 'A mechanical ranged weapon.',       buff: '1d8 piercing, loading, 80/320 ft',          quantity: 1, equipped: false },
    { name: 'Bolt',          item_type: 'item',   description: 'Crossbow ammunition.',              buff: '',                                          quantity: 20, equipped: false },
    { name: 'Component Pouch',item_type:'item',   description: 'A belt pouch with spell components.', buff: 'Required for Sorcerer spells',           quantity: 1, equipped: false },
    { name: "Dungeoneer's Pack",item_type:'item', description: 'Supplies for underground exploration.', buff: '',                                      quantity: 1, equipped: false },
    // Spells
    { name: 'Fire Bolt',     item_type: 'spell', description: 'Cantrip. Hurl a mote of fire at a target within 120 ft.',          buff: '1d10 fire · ranged spell attack · 120 ft',                         quantity: 1, equipped: false },
    { name: 'Ray of Frost',  item_type: 'spell', description: 'Cantrip. A frigid beam of blue-white light streaks toward a creature.', buff: '1d8 cold · target speed reduced 10 ft until next turn · 60 ft', quantity: 1, equipped: false },
    { name: 'Mage Hand',     item_type: 'spell', description: 'Cantrip. A spectral, floating hand appears.',                       buff: 'Manipulate objects up to 10 lb · 30 ft range · 1 min',             quantity: 1, equipped: false },
    { name: 'Prestidigitation',item_type:'spell', description: 'Cantrip. Minor magical tricks: light, clean, chill, warm, color.', buff: 'Utility cantrip, no damage',                                      quantity: 1, equipped: false },
    { name: 'Magic Missile', item_type: 'spell', description: '1st level. Create three glowing darts of magical force.',          buff: '3 × 1d4+1 force · always hits · 120 ft',                          quantity: 1, equipped: false },
    { name: 'Burning Hands', item_type: 'spell', description: '1st level. A thin sheet of flames shoots forth from your fingertips.', buff: '3d6 fire · 15 ft cone · DEX save for half',                  quantity: 1, equipped: false },
  ],
  Warlock: [
    { name: 'Dagger',        item_type: 'weapon', description: 'An infernal-edged short blade.',   buff: '1d4 piercing, finesse, light, thrown (20/60 ft)', quantity: 2, equipped: true  },
    { name: 'Light Crossbow',item_type: 'weapon', description: 'A mechanical ranged weapon.',       buff: '1d8 piercing, loading, 80/320 ft',          quantity: 1, equipped: false },
    { name: 'Bolt',          item_type: 'item',   description: 'Crossbow ammunition.',              buff: '',                                          quantity: 20, equipped: false },
    { name: 'Leather Armor', item_type: 'armor',  description: 'Lightweight dark leather.',        buff: 'AC 11 + DEX mod',                           quantity: 1, equipped: true  },
    { name: 'Arcane Focus',  item_type: 'item',   description: 'A focus for eldritch power.',      buff: 'Required for Warlock spells',              quantity: 1, equipped: false },
    { name: "Scholar's Pack",item_type: 'item',   description: 'Books, ink, and scholarly supplies.', buff: '',                                        quantity: 1, equipped: false },
    // Spells
    { name: 'Eldritch Blast',item_type: 'spell', description: 'Cantrip. A beam of crackling energy streaks toward a creature.',  buff: '1d10 force · ranged spell attack · 120 ft',                        quantity: 1, equipped: false },
    { name: 'Minor Illusion',item_type: 'spell', description: 'Cantrip. Create a sound or small image within 30 ft.',             buff: 'Sound or image · 1 min · INT save to disbelieve',                  quantity: 1, equipped: false },
    { name: 'Hex',           item_type: 'spell', description: '1st level. Curse a creature — it takes extra damage from your attacks.', buff: '+1d6 necrotic on hit · disadvantage on chosen ability · concentration 1 hour', quantity: 1, equipped: false },
    { name: 'Armor of Agathys',item_type:'spell', description: '1st level. A protective magical force surrounds you as cold icy armor.', buff: '5 temp HP · 5 cold damage to attackers who hit you',         quantity: 1, equipped: false },
  ],
  Wizard: [
    { name: 'Quarterstaff',  item_type: 'weapon', description: 'A sturdy walking staff, good in a pinch.', buff: '1d6 bludgeoning, versatile (1d8)', quantity: 1, equipped: true  },
    { name: 'Dagger',        item_type: 'weapon', description: 'A simple backup blade.',           buff: '1d4 piercing, finesse, light, thrown (20/60 ft)', quantity: 2, equipped: false },
    { name: 'Spellbook',     item_type: 'item',   description: 'A tome of arcane formulae.',       buff: 'Required for Wizard spells; contains known spells', quantity: 1, equipped: false },
    { name: 'Component Pouch',item_type:'item',   description: 'A belt pouch with spell components.', buff: 'Required for Wizard spells',            quantity: 1, equipped: false },
    { name: "Scholar's Pack",item_type: 'item',   description: 'Books, ink, and scholarly supplies.', buff: '',                                        quantity: 1, equipped: false },
    // Spells — Cantrips
    { name: 'Fire Bolt',     item_type: 'spell', description: 'Cantrip. Hurl a mote of fire at a creature within 120 ft.',        buff: '1d10 fire · ranged spell attack · 120 ft',                         quantity: 1, equipped: false },
    { name: 'Mage Hand',     item_type: 'spell', description: 'Cantrip. A spectral floating hand appears to manipulate objects.',  buff: 'Telekinesis up to 10 lb · 30 ft range · 1 min',                   quantity: 1, equipped: false },
    { name: 'Prestidigitation',item_type:'spell', description: 'Cantrip. Minor magical tricks: light, color, clean, sounds.',      buff: 'Utility cantrip, no damage',                                      quantity: 1, equipped: false },
    // Spells — 1st Level
    { name: 'Magic Missile', item_type: 'spell', description: '1st level. Three darts of magical force that never miss.',         buff: '3 × 1d4+1 force · auto-hit · 120 ft',                             quantity: 1, equipped: false },
    { name: 'Shield',        item_type: 'spell', description: '1st level. React to an incoming attack with a barrier of force.',   buff: '+5 AC until start of next turn · reaction · negates Magic Missile', quantity: 1, equipped: false },
    { name: 'Mage Armor',    item_type: 'spell', description: '1st level. Magical force armor envelops a willing creature.',      buff: 'AC becomes 13 + DEX mod · 8 hours · no worn armor',               quantity: 1, equipped: false },
    { name: 'Thunderwave',   item_type: 'spell', description: '1st level. A wave of thunderous force sweeps out from you.',       buff: '2d8 thunder · 15 ft cube · CON save or pushed 10 ft',              quantity: 1, equipped: false },
    { name: 'Sleep',         item_type: 'spell', description: '1st level. Send creatures into a magical slumber.',                buff: '5d8 HP worth of creatures fall asleep · 90 ft range · no save',    quantity: 1, equipped: false },
    { name: 'Detect Magic',  item_type: 'spell', description: '1st level. Sense the presence of magic within 30 ft.',             buff: 'Detect magical auras · concentration 10 min · ritual',             quantity: 1, equipped: false },
  ],
}

function calcAC(character, inventory) {
  const dexMod = mod(character.dex_stat ?? 10)
  if (character.ac_override != null) return character.ac_override
  const equipped  = (inventory || []).filter(i => i.equipped && i.item_type === 'armor')
  const shield    = equipped.find(i => /shield/i.test(i.name))
  const mainArmor = equipped.find(i => !/shield/i.test(i.name))
  let ac = 10 + dexMod
  if (mainArmor) {
    const m = mainArmor.buff?.match(/ac\s+(\d+)/i)
    if (m) {
      const base = parseInt(m[1])
      if (/heavy|no dex/i.test(mainArmor.buff))       ac = base
      else if (/medium|max dex\s*\+?2/i.test(mainArmor.buff)) ac = base + Math.min(dexMod, 2)
      else                                              ac = base + dexMod
    }
  }
  if (shield) ac += 2
  return ac
}

// Dev account gets unlimited coins — no deductions
const DEV_USER_ID = '0b5648d4-110b-4edf-8728-e7bd0868255d'

// Standard D&D 5e XP thresholds — index = level - 1

function fmtXP(n) { return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n) }

function mod(val) { return Math.floor((val - 10) / 2) }
function modStr(n) { return n >= 0 ? `+${n}` : `${n}` }

// Parse [[ROLL:{...}]], [[NPC:{...}]], [[QUEST:{...}]], [[QUEST_COMPLETE:{...}]] tags
function parseGMMessage(text) {
  let cleaned = text
  // If a ROLL tag is present, strip any questions so the player isn't asked
  // to make a decision AND roll at the same time
  if (/\[\[ROLL:/.test(cleaned)) {
    // Remove "What is your X roll?" / "Make a X roll." type prompts anywhere in text
    cleaned = cleaned.replace(/\n?[^\n]*\broll\b[^\n]*\?[\s]*/gi, '\n')
    // Remove trailing question lines
    cleaned = cleaned.replace(/\n[^\n]{3,100}\?[\s]*$/m, '')
    // Remove bold questions like **What do you do?**
    cleaned = cleaned.replace(/\*{0,2}[A-Z][^*\n]{0,80}\?\*{0,2}[\s]*/gm, '')
    // Remove "Make a check." / "Make a saving throw." prompts
    cleaned = cleaned.replace(/\nMake a [^\n]+\.\s*/gi, '\n')
    // Collapse extra blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trimEnd()
  }

  // Extract roll tag
  let roll = null
  const rollMatch = cleaned.match(/\[\[ROLL:([\s\S]*?)\]\]/)
  if (rollMatch) {
    try { roll = JSON.parse(rollMatch[1]) } catch {}
    cleaned = cleaned.replace(rollMatch[0], '')
  }

  // Extract all NPC tags — separate into upserts and removes
  const npcs = [], removeNpcs = []
  const npcRegex = /\[\[NPC:([\s\S]*?)\]\]/g
  let m
  while ((m = npcRegex.exec(cleaned)) !== null) {
    try {
      const npc = JSON.parse(m[1])
      if (npc.remove) removeNpcs.push(npc)
      else npcs.push(npc)
    } catch {}
  }
  cleaned = cleaned.replace(/\[\[NPC:[\s\S]*?\]\]/g, '')

  // Extract new quests
  const newQuests = []
  const questRegex = /\[\[QUEST:(\{[^[\]]+\})\]\]/g
  while ((m = questRegex.exec(cleaned)) !== null) {
    try { newQuests.push(JSON.parse(m[1])) } catch {}
  }
  cleaned = cleaned.replace(/\[\[QUEST:\{[^[\]]+\}\]\]/g, '')

  // Extract quest completions
  const completedQuests = []
  const completeRegex = /\[\[QUEST_COMPLETE:(\{[^[\]]+\})\]\]/g
  while ((m = completeRegex.exec(cleaned)) !== null) {
    try { completedQuests.push(JSON.parse(m[1])) } catch {}
  }
  cleaned = cleaned.replace(/\[\[QUEST_COMPLETE:\{[^[\]]+\}\]\]/g, '')

  // Extract XP awards
  let xpAward = null
  const xpMatch = cleaned.match(/\[\[XP:(\{[^[\]]+\})\]\]/)
  if (xpMatch) {
    try { xpAward = JSON.parse(xpMatch[1]) } catch {}
    cleaned = cleaned.replace(xpMatch[0], '')
  }

  // Extract HP update
  let hpUpdate = null
  const hpMatch = cleaned.match(/\[\[HP:(\{[^[\]]+\})\]\]/)
  if (hpMatch) {
    try { hpUpdate = JSON.parse(hpMatch[1]) } catch {}
    cleaned = cleaned.replace(hpMatch[0], '')
  }

  // Extract AC override
  let acUpdate = null
  const acMatch = cleaned.match(/\[\[AC:(\{[^[\]]+\})\]\]/)
  if (acMatch) {
    try { acUpdate = JSON.parse(acMatch[1]) } catch {}
    cleaned = cleaned.replace(acMatch[0], '')
  }

  // Extract inventory items (multiple) — use [\s\S]*? for robust JSON matching
  const newItems = []
  const itemRegex = /\[\[ITEM:([\s\S]*?)\]\]/g
  while ((m = itemRegex.exec(cleaned)) !== null) {
    const candidate = m[1].trim()
    if (candidate.startsWith('{') && candidate.endsWith('}')) {
      try { newItems.push(JSON.parse(candidate)) } catch {}
    }
  }
  cleaned = cleaned.replace(/\[\[ITEM:[\s\S]*?\]\]/g, '')

  // Extract item removals
  const removeItems = []
  const removeRegex = /\[\[ITEM_REMOVE:([\s\S]*?)\]\]/g
  while ((m = removeRegex.exec(cleaned)) !== null) {
    const candidate = m[1].trim()
    if (candidate.startsWith('{') && candidate.endsWith('}')) {
      try { removeItems.push(JSON.parse(candidate)) } catch {}
    }
  }
  cleaned = cleaned.replace(/\[\[ITEM_REMOVE:[\s\S]*?\]\]/g, '')

  // Strip any incomplete [[TAG... fragments (truncated by token limit)
  cleaned = cleaned.replace(/\[\[[A-Z_]+:[^[\]]*$/g, '').trim()

  return { text: cleaned, roll, npcs, removeNpcs, newQuests, completedQuests, xpAward, hpUpdate, acUpdate, newItems, removeItems }
}

// ── Markdown renderer (subset: headings, bold, italic, hr, paragraphs) ────────
function inlineMd(text, key) {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/)
  return (
    <span key={key}>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
        if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i}>{p.slice(1, -1)}</em>
        return p
      })}
    </span>
  )
}

function renderMarkdown(text) {
  const lines = text.split('\n')
  const out = []
  let paraLines = []

  const flushPara = (idx) => {
    if (!paraLines.length) return
    out.push(
      <p key={`p-${idx}`} style={{ marginBottom: '0.9em', lineHeight: 1.75 }}>
        {paraLines.map((l, i) => [i > 0 && <br key={`br-${i}`} />, inlineMd(l, i)])}
      </p>
    )
    paraLines = []
  }

  lines.forEach((line, idx) => {
    if (/^#{1}\s/.test(line)) {
      flushPara(idx)
      out.push(<h3 key={idx} style={{ color: 'var(--gold-bright)', textShadow: '0 0 12px var(--gold-glow)', marginBottom: '10px', fontSize: '1.05rem' }}>{inlineMd(line.replace(/^#+\s/, ''), 0)}</h3>)
    } else if (/^#{2,3}\s/.test(line)) {
      flushPara(idx)
      out.push(<h4 key={idx} style={{ color: 'var(--gold)', marginBottom: '6px', fontSize: '0.9rem', letterSpacing: '0.03em' }}>{inlineMd(line.replace(/^#+\s/, ''), 0)}</h4>)
    } else if (/^-{3,}$/.test(line.trim())) {
      flushPara(idx)
      out.push(<hr key={idx} className="divider" style={{ margin: '12px 0' }} />)
    } else if (line.trim() === '') {
      flushPara(idx)
    } else {
      paraLines.push(line)
    }
  })
  flushPara(lines.length)
  return out
}

// ── Roll Card ─────────────────────────────────────────────────────────────────
// Roll NdX dice, return array of results
function rollDice(diceStr) {
  const m = diceStr.match(/^(\d+)d(\d+)$/)
  if (!m) return [0]
  const n = parseInt(m[1]), x = parseInt(m[2])
  return Array.from({ length: n }, () => Math.floor(Math.random() * x) + 1)
}

function RollCard({ roll, character, onRolled, riggedRoll }) {
  const [rolling, setRolling] = useState(false)
  const [result, setResult]   = useState(null)
  const [display, setDisplay] = useState(null)

  const isDamage = roll.type === 'damage'
  const dice     = roll.dice ?? '1d20'
  // bonus: explicit modifier OR stat-derived
  const statBonus = roll.stat ? mod(character[STAT_KEY[roll.stat]] ?? 10) : 0
  const bonus     = roll.modifier !== undefined ? roll.modifier : statBonus
  const statLabel = roll.stat ? (STAT_FULL[roll.stat] ?? roll.stat.toUpperCase()) : null
  const diceSides = parseInt((dice.match(/d(\d+)/) ?? [])[1] ?? '20')

  function execute() {
    setRolling(true)
    let ticks = 0
    const interval = setInterval(() => {
      setDisplay(Math.floor(Math.random() * diceSides) + 1)
      ticks++
      if (ticks > 14) {
        clearInterval(interval)
        let rolls, sum
        if (riggedRoll !== null && riggedRoll !== undefined) {
          // Rig: distribute the total across dice as evenly as possible
          const n = parseInt((dice.match(/^(\d+)d/) ?? [])[1] ?? '1')
          const base = Math.floor(riggedRoll / n)
          rolls = Array.from({ length: n }, (_, i) => i === 0 ? riggedRoll - base * (n - 1) : base)
          sum = riggedRoll
        } else {
          rolls = rollDice(dice)
          sum   = rolls.reduce((a, b) => a + b, 0)
        }
        const total = sum + bonus
        setDisplay(null)
        setResult({ rolls, sum, bonus, total })
        setRolling(false)
        setTimeout(() => onRolled({ rolls, sum, bonus, total, roll }), 1400)
      }
    }, 60)
  }

  const hitColor = isDamage ? 'var(--red)' : 'var(--gold)'

  return (
    <div style={{
      background: isDamage ? 'rgba(176,48,48,0.08)' : 'rgba(201,168,76,0.06)',
      border: `1px solid ${isDamage ? 'var(--red)' : 'var(--gold-dim)'}`,
      borderRadius: 'var(--radius)', padding: '16px', margin: '8px 0',
    }}>
      <div style={{ fontSize: '0.72rem', color: isDamage ? 'var(--red)' : 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
        🎲 {isDamage ? 'Damage Roll' : 'Roll Required'}
      </div>
      <div style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: 'bold', marginBottom: '4px' }}>
        {roll.label ?? roll.type}
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <div style={{ fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-dim)' }}>Dice: </span>
          <span style={{ color: 'var(--text)' }}>{dice}</span>
        </div>
        <div style={{ fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-dim)' }}>Modifier: </span>
          <span style={{ color: bonus >= 0 ? 'var(--gold)' : 'var(--red)' }}>{bonus >= 0 ? '+' : ''}{bonus}</span>
          {statLabel && <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}> ({statLabel})</span>}
        </div>
        {/* DC intentionally hidden from player */}
      </div>

      {!result ? (
        <button className="btn btn-gold" style={{ fontSize: '1rem', padding: '10px 28px', background: isDamage ? 'var(--red)' : undefined, borderColor: isDamage ? 'var(--red)' : undefined }}
          onClick={execute} disabled={rolling}>
          {rolling
            ? <span style={{ fontFamily: 'monospace', fontSize: '1.3rem', display: 'inline-block', width: '28px', textAlign: 'center' }}>{display ?? '…'}</span>
            : `🎲 Roll ${dice}`}
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 'bold', color: hitColor, lineHeight: 1 }}>
            {result.total}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
            <div>{result.rolls.join('+')} = {result.sum} {bonus >= 0 ? '+' : ''}{bonus}</div>

          </div>
        </div>
      )}
    </div>
  )
}

// ── Collapsible sidebar section ───────────────────────────────────────────────
function CollapsibleSection({ label, sectionKey, collapsed, onToggle, children }) {
  return (
    <div className="collapsible-section">
      <div className="collapsible-label" onClick={() => onToggle(sectionKey)}>
        <span>{label}</span>
        <span className={`section-chevron${collapsed ? '' : ' open'}`}>▸</span>
      </div>
      {!collapsed && <div className="collapsible-body">{children}</div>}
    </div>
  )
}

// ── Racial starting features ──────────────────────────────────────────────────
const RACIAL_FEATURES = {
  Human:     [{ name: 'Versatile Training', item_type: 'feature', description: 'Humans gain one extra skill proficiency and adapt quickly to new challenges.', buff: '+1 to any one ability score (reflected in character stats)', quantity: 1, equipped: true }],
  Elf:       [
    { name: 'Darkvision', item_type: 'feature', description: 'You can see in dim light within 60 feet as if it were bright light.', buff: 'Darkvision 60 ft', quantity: 1, equipped: true },
    { name: 'Fey Ancestry', item_type: 'feature', description: 'You have advantage on saving throws against being charmed, and magic cannot put you to sleep.', buff: 'Advantage vs charm; immune to magical sleep', quantity: 1, equipped: true },
  ],
  Dwarf:     [
    { name: 'Darkvision', item_type: 'feature', description: 'You can see in dim light within 60 feet as if it were bright light.', buff: 'Darkvision 60 ft', quantity: 1, equipped: true },
    { name: 'Dwarven Resilience', item_type: 'feature', description: 'You have advantage on saving throws against poison and resistance against poison damage.', buff: 'Advantage vs poison saves; resistance to poison damage', quantity: 1, equipped: true },
    { name: 'Stonecunning', item_type: 'feature', description: 'Whenever you make an Intelligence (History) check related to stonework, you are considered proficient.', buff: 'Double proficiency on stonework History checks', quantity: 1, equipped: true },
  ],
  Halfling:  [
    { name: 'Lucky', item_type: 'feature', description: 'When you roll a 1 on a d20 for an attack roll, ability check, or saving throw, you can reroll and must use the new result.', buff: 'Reroll natural 1s on d20 rolls', quantity: 1, equipped: true },
    { name: 'Brave', item_type: 'feature', description: 'You have advantage on saving throws against being frightened.', buff: 'Advantage vs frightened condition', quantity: 1, equipped: true },
    { name: 'Halfling Nimbleness', item_type: 'feature', description: 'You can move through the space of any creature that is of a size larger than yours.', buff: 'Move through larger creatures\' spaces', quantity: 1, equipped: true },
  ],
  Dragonborn:[
    { name: 'Breath Weapon', item_type: 'feature', description: 'You can exhale destructive energy as an action. Creatures in a 15-ft cone make a DEX save (DC 8 + CON mod + proficiency).', buff: '2d6 damage (your draconic damage type); recharges on short/long rest', quantity: 1, equipped: true },
    { name: 'Draconic Ancestry', item_type: 'feature', description: 'You have draconic heritage granting resistance to your damage type.', buff: 'Resistance to draconic ancestry damage type', quantity: 1, equipped: true },
  ],
  Gnome:     [
    { name: 'Darkvision', item_type: 'feature', description: 'You can see in dim light within 60 feet as if it were bright light.', buff: 'Darkvision 60 ft', quantity: 1, equipped: true },
    { name: 'Gnome Cunning', item_type: 'feature', description: 'You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.', buff: 'Advantage on INT/WIS/CHA saves vs magic', quantity: 1, equipped: true },
  ],
  'Half-Elf':[
    { name: 'Darkvision', item_type: 'feature', description: 'You can see in dim light within 60 feet as if it were bright light.', buff: 'Darkvision 60 ft', quantity: 1, equipped: true },
    { name: 'Fey Ancestry', item_type: 'feature', description: 'Advantage on saving throws against being charmed; magic cannot put you to sleep.', buff: 'Advantage vs charm; immune to magical sleep', quantity: 1, equipped: true },
    { name: 'Skill Versatility', item_type: 'feature', description: 'You gain proficiency in two skills of your choice.', buff: '+2 additional skill proficiencies', quantity: 1, equipped: true },
  ],
  'Half-Orc':[
    { name: 'Darkvision', item_type: 'feature', description: 'You can see in dim light within 60 feet as if it were bright light.', buff: 'Darkvision 60 ft', quantity: 1, equipped: true },
    { name: 'Relentless Endurance', item_type: 'feature', description: 'When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. Once used, recharges on long rest.', buff: 'Drop to 1 HP instead of 0 once per long rest', quantity: 1, equipped: true },
    { name: 'Savage Attacks', item_type: 'feature', description: 'When you score a critical hit with a melee weapon attack, you can roll one of the weapon\'s damage dice one additional time.', buff: 'Extra damage die on critical hits with melee weapons', quantity: 1, equipped: true },
  ],
  Tiefling:  [
    { name: 'Darkvision', item_type: 'feature', description: 'You can see in dim light within 60 feet as if it were bright light.', buff: 'Darkvision 60 ft', quantity: 1, equipped: true },
    { name: 'Hellish Resistance', item_type: 'feature', description: 'Your infernal bloodline grants you resistance to fire damage.', buff: 'Resistance to fire damage', quantity: 1, equipped: true },
    { name: 'Infernal Legacy', item_type: 'feature', description: 'You know the Thaumaturgy cantrip. At 3rd level, you can cast Hellish Rebuke once per long rest. At 5th level, you can cast Darkness once per long rest.', buff: 'Thaumaturgy cantrip; Hellish Rebuke at lvl 3; Darkness at lvl 5', quantity: 1, equipped: true },
  ],
}

// ── DevTools (dev user only) ──────────────────────────────────────────────────
const STAT_KEYS_DEV = ['str_stat','dex_stat','con_stat','int_stat','wis_stat','cha_stat']
const STAT_LABELS_DEV = ['STR','DEX','CON','INT','WIS','CHA']

function DevTools({ character, riggedRoll, setRiggedRoll, devXpInput, setDevXpInput,
  devStatEdit, setDevStatEdit, onAddXp, onSetStat, onSetProfBonus, onSetMaxHp }) {
  const [statVals, setStatVals] = useState(STAT_KEYS_DEV.reduce((a,k) => ({ ...a, [k]: character[k] ?? 10 }), {}))
  const [profVal, setProfVal]   = useState(character.prof_bonus_override ?? profBonus(character.level ?? 1))
  const [maxHpVal, setMaxHpVal] = useState(character.max_hp ?? 1)
  const [saved, setSaved]       = useState(false)

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1200) }

  return (
    <div style={{
      background: '#0d0d1a', border: '2px solid #3a2a6a', borderRadius: '10px',
      padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px',
      fontFamily: 'monospace', fontSize: '0.78rem',
    }}>
      <div style={{ color: '#9966ff', fontWeight: 'bold', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        🛠 Dev Tools
      </div>

      {/* XP injection */}
      <div>
        <div style={{ color: '#7a7aaa', marginBottom: '6px' }}>Add XP</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[100,300,900,2700].map(amt => (
            <button key={amt} onClick={() => onAddXp(amt)}
              style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '5px', cursor: 'pointer',
                background: '#1a1a3a', border: '1px solid #3a3a6a', color: '#c0c0ff' }}>
              +{amt} XP
            </button>
          ))}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input value={devXpInput} onChange={e => setDevXpInput(e.target.value)}
              placeholder="custom" type="number"
              style={{ width: '70px', padding: '4px 6px', borderRadius: '5px', fontSize: '0.72rem',
                background: '#111', border: '1px solid #3a3a6a', color: '#e0d8c8' }} />
            <button onClick={() => { const n = parseInt(devXpInput); if (!isNaN(n)) { onAddXp(n); setDevXpInput('') } }}
              style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '5px', cursor: 'pointer',
                background: '#2a1a4a', border: '1px solid #6a3aaa', color: '#c0a0ff' }}>
              Add
            </button>
          </div>
        </div>
        <div style={{ color: '#5a5a8a', marginTop: '4px' }}>
          Current: {character.xp ?? 0} XP · Level {character.level ?? 1}
        </div>
      </div>

      {/* Ability scores */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ color: '#7a7aaa' }}>Ability Scores</span>
          <button onClick={() => setDevStatEdit(v => !v)}
            style={{ padding: '2px 8px', fontSize: '0.68rem', borderRadius: '4px', cursor: 'pointer',
              background: devStatEdit ? '#2a3a1a' : '#1a1a3a', border: `1px solid ${devStatEdit ? '#4a7a2a' : '#3a3a6a'}`, color: devStatEdit ? '#80c040' : '#8080aa' }}>
            {devStatEdit ? '✓ editing' : 'edit'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '6px' }}>
          {STAT_KEYS_DEV.map((k, i) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#5a5a8a' }}>{STAT_LABELS_DEV[i]}</div>
              {devStatEdit
                ? <input type="number" value={statVals[k]} min={1} max={30}
                    onChange={e => setStatVals(v => ({ ...v, [k]: parseInt(e.target.value) || 10 }))}
                    style={{ width: '38px', padding: '3px 2px', textAlign: 'center', borderRadius: '4px', fontSize: '0.78rem',
                      background: '#111', border: '1px solid #4a3a7a', color: '#e0d8c8' }} />
                : <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#c0a0ff' }}>{character[k] ?? 10}</div>
              }
            </div>
          ))}
        </div>
        {devStatEdit && (
          <button onClick={async () => {
            for (const k of STAT_KEYS_DEV) await onSetStat(k, statVals[k])
            flash()
          }} style={{ marginTop: '8px', width: '100%', padding: '5px', fontSize: '0.72rem', borderRadius: '5px',
            cursor: 'pointer', background: '#1a3a1a', border: '1px solid #4a8a2a', color: '#80d040' }}>
            {saved ? '✓ Saved!' : 'Save Stats'}
          </button>
        )}
      </div>

      {/* Prof bonus + Max HP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <div style={{ color: '#7a7aaa', marginBottom: '4px' }}>Prof Bonus</div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input type="number" value={profVal} min={2} max={6}
              onChange={e => setProfVal(parseInt(e.target.value) || 2)}
              style={{ width: '44px', padding: '4px', textAlign: 'center', borderRadius: '4px', fontSize: '0.82rem',
                background: '#111', border: '1px solid #3a3a6a', color: '#e0d8c8' }} />
            <button onClick={async () => { await onSetProfBonus(profVal); flash() }}
              style={{ padding: '4px 8px', fontSize: '0.68rem', borderRadius: '4px', cursor: 'pointer',
                background: '#1a1a3a', border: '1px solid #4a3a7a', color: '#c0a0ff' }}>Set</button>
          </div>
        </div>
        <div>
          <div style={{ color: '#7a7aaa', marginBottom: '4px' }}>Max HP</div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input type="number" value={maxHpVal} min={1}
              onChange={e => setMaxHpVal(parseInt(e.target.value) || 1)}
              style={{ width: '52px', padding: '4px', textAlign: 'center', borderRadius: '4px', fontSize: '0.82rem',
                background: '#111', border: '1px solid #3a3a6a', color: '#e0d8c8' }} />
            <button onClick={async () => { await onSetMaxHp(maxHpVal); flash() }}
              style={{ padding: '4px 8px', fontSize: '0.68rem', borderRadius: '4px', cursor: 'pointer',
                background: '#1a1a3a', border: '1px solid #4a3a7a', color: '#c0a0ff' }}>Set</button>
          </div>
        </div>
      </div>

      {/* Rigged roll */}
      <div>
        <div style={{ color: '#7a7aaa', marginBottom: '6px' }}>Rig Next Roll <span style={{ color: '#4a4a6a' }}>(sets the dice total before modifier)</span></div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[1,10,15,20].map(n => (
            <button key={n} onClick={() => setRiggedRoll(riggedRoll === n ? null : n)}
              style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '5px', cursor: 'pointer',
                background: riggedRoll === n ? '#3a1a1a' : '#1a1a3a',
                border: `1px solid ${riggedRoll === n ? '#aa3a3a' : '#3a3a6a'}`,
                color: riggedRoll === n ? '#ff8080' : '#c0c0ff' }}>
              {n === 1 ? '💀 1' : n === 20 ? '⭐ 20' : n}
            </button>
          ))}
          <input type="number" placeholder="custom" min={1}
            onChange={e => setRiggedRoll(parseInt(e.target.value) || null)}
            value={riggedRoll ?? ''}
            style={{ width: '60px', padding: '4px 6px', borderRadius: '5px', fontSize: '0.72rem',
              background: '#111', border: `1px solid ${riggedRoll ? '#aa5a00' : '#3a3a6a'}`, color: '#e0d8c8' }} />
          {riggedRoll !== null && (
            <button onClick={() => setRiggedRoll(null)}
              style={{ padding: '4px 8px', fontSize: '0.68rem', borderRadius: '4px', cursor: 'pointer',
                background: '#1a1a1a', border: '1px solid #5a3a3a', color: '#aa6060' }}>
              Clear
            </button>
          )}
        </div>
        {riggedRoll !== null && (
          <div style={{ color: '#ff9933', fontSize: '0.7rem', marginTop: '4px' }}>
            🎯 Next roll will show {riggedRoll} (before modifiers)
          </div>
        )}
      </div>
    </div>
  )
}

// ── Campaign ──────────────────────────────────────────────────────────────────
export default function Campaign({ session, profile, campaign, onCoinsChanged, onBack }) {
  const [character, setCharacter]     = useState(null)
  const [messages, setMessages]       = useState([])
  const [pendingRoll, setPendingRoll] = useState(null)
  const [npcs, setNpcs]               = useState([])
  const [quests, setQuests]           = useState([])
  const [inventory, setInventory]     = useState([])
  const [sideTab, setSideTab]         = useState('stats') // null | 'stats'|'inventory'|'quests'|'chars'
  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [expandedItems, setExpandedItems]         = useState(new Set())
  const [input, setInput]             = useState('')
  const [typing, setTyping]           = useState(false)
  const [coins, setCoins]             = useState(profile?.coins ?? 0)
  const [loaded, setLoaded]           = useState(false)
  const [xpGain, setXpGain]           = useState(null) // { amount, reason, leveledUp, newLevel }
  const [error, setError]             = useState('')
  const [debugMode, setDebugMode]     = useState(false)
  const [riggedRoll, setRiggedRoll]   = useState(null) // number or null
  const [devXpInput, setDevXpInput]   = useState('')
  const [devStatEdit, setDevStatEdit] = useState(false)
  const [debugLog, setDebugLog]       = useState([])
  const [gmPersona, setGmPersona]     = useState('classic')
  const [levelUpQueue, setLevelUpQueue]     = useState([]) // array of levels to process
  const [showLevelUp, setShowLevelUp]       = useState(false)
  const pendingLevelUp = levelUpQueue.length > 0
  const [inventoryTab, setInventoryTab]     = useState('items') // 'items' | 'abilities'
  const bottomRef = useRef(null)
  const isDevUser = session.user.id === DEV_USER_ID

  function dbLog(tag, err) {
    const msg = `[${new Date().toLocaleTimeString()}] ${tag}: ${err?.message || JSON.stringify(err) || 'unknown error'}`
    setDebugLog(prev => [msg, ...prev].slice(0, 50))
  }

  function toggleSection(key) {
    setCollapsedSections(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function toggleItem(id) {
    setExpandedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  useEffect(() => { loadCampaign() }, [campaign.id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing, pendingRoll])

  async function safeQuery(queryPromise, fallback = []) {
    try {
      const { data } = await queryPromise
      return data ?? fallback
    } catch {
      return fallback
    }
  }

  async function loadCampaign() {
    const [char, msgs, npcRows, questRows, invRows] = await Promise.all([
      safeQuery(supabase.from('characters').select('*').eq('id', campaign.character_id).single(), null),
      safeQuery(supabase.from('campaign_messages').select('*').eq('campaign_id', campaign.id).order('created_at')),
      safeQuery(supabase.from('campaign_npcs').select('*').eq('campaign_id', campaign.id).order('first_seen')),
      safeQuery(supabase.from('quests').select('*').eq('campaign_id', campaign.id).order('created_at')),
      safeQuery(supabase.from('inventory').select('*').eq('campaign_id', campaign.id).order('created_at')),
    ])
    setCharacter(char)
    setNpcs(npcRows || [])
    setQuests(questRows || [])
    setInventory(invRows || [])
    setMessages(msgs || [])
    // Restore any pending roll from last GM message
    if (msgs?.length) {
      const last = msgs.filter(m => m.role === 'assistant').pop()
      if (last) {
        const { roll } = parseGMMessage(last.content)
        if (roll) setPendingRoll(roll)
      }
    }
    setLoaded(true)
  }

  async function upsertNpcs(npcList) {
    if (!npcList?.length) return
    for (const npc of npcList) {
      // If this NPC is a revealed identity, rename the old placeholder in-place
      // (safer than delete+insert: lower blast radius if the GM is wrong)
      if (npc.replaces) {
        const { data: placeholder } = await supabase
          .from('campaign_npcs').select('id')
          .eq('campaign_id', campaign.id).ilike('name', npc.replaces).maybeSingle()
        if (placeholder) {
          await supabase.from('campaign_npcs').update({
            name: npc.name, type: npc.type, description: npc.description,
            known_info: npc.known_info, updated_at: new Date().toISOString(),
          }).eq('id', placeholder.id)
          continue  // already handled — skip the upsert below
        }
      }

      // Check if an entry with this name already exists (case-insensitive)
      const { data: existing } = await supabase
        .from('campaign_npcs').select('id')
        .eq('campaign_id', campaign.id)
        .ilike('name', npc.name).maybeSingle()

      if (existing) {
        await supabase.from('campaign_npcs').update({
          type: npc.type, description: npc.description,
          known_info: npc.known_info, updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await supabase.from('campaign_npcs').insert({
          campaign_id: campaign.id, name: npc.name, type: npc.type,
          description: npc.description, known_info: npc.known_info,
        })
      }
    }
    // Refresh NPC list
    const { data } = await supabase.from('campaign_npcs').select('*')
      .eq('campaign_id', campaign.id).order('first_seen')
    setNpcs(data || [])
  }

  async function deleteNpcs(npcList) {
    if (!npcList?.length) return
    for (const npc of npcList) {
      // Delete by name OR by the name it replaced (handles remove:true on updated entries)
      const names = [npc.name, npc.replaces].filter(Boolean)
      for (const name of names) {
        await supabase.from('campaign_npcs')
          .delete().eq('campaign_id', campaign.id).ilike('name', name)
      }
    }
    const { data } = await supabase.from('campaign_npcs').select('*')
      .eq('campaign_id', campaign.id).order('first_seen')
    setNpcs(data || [])
  }

  async function upsertQuests(newQuests, completedQuests) {
    if (!newQuests?.length && !completedQuests?.length) return

    // Add new quests (skip if title already exists)
    for (const q of (newQuests || [])) {
      const { data: existing } = await supabase
        .from('quests').select('id')
        .eq('campaign_id', campaign.id)
        .ilike('title', q.title).maybeSingle()
      if (!existing) {
        await supabase.from('quests').insert({
          campaign_id: campaign.id, title: q.title, description: q.description || '',
        })
      }
    }

    // Mark quests complete
    for (const q of (completedQuests || [])) {
      await supabase.from('quests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('campaign_id', campaign.id)
        .ilike('title', q.title)
    }

    // Refresh quest list
    const { data } = await supabase.from('quests').select('*')
      .eq('campaign_id', campaign.id).order('created_at')
    setQuests(data || [])
  }

  async function awardXP(xpAward) {
    if (!xpAward?.amount || xpAward.amount <= 0) return
    const currentXp  = character.xp ?? 0
    const newXp      = currentXp + xpAward.amount
    const oldLevel   = character.level ?? 1
    const newLevel   = Math.min(xpToLevel(newXp), 20)
    const leveledUp  = newLevel > oldLevel

    await supabase.from('characters')
      .update({ xp: newXp, level: newLevel })
      .eq('id', character.id)

    setCharacter(c => ({ ...c, xp: newXp, level: newLevel }))
    setXpGain({ amount: xpAward.amount, reason: xpAward.reason, leveledUp, newLevel })
    setTimeout(() => setXpGain(null), 5000)
    if (leveledUp) {
      const queue = []
      for (let l = oldLevel + 1; l <= newLevel; l++) queue.push(l)
      setLevelUpQueue(queue)
    }
  }

  async function applyLevelUp({ newLevel, hpGain, newFeatures, asi, subclass, fightingStyle }) {
    // HP increase
    const newMaxHp   = (character.max_hp || 0) + hpGain
    const newCurrHp  = (character.current_hp || 0) + hpGain
    const updates    = { max_hp: newMaxHp, current_hp: newCurrHp }

    // ASI
    let updatedChar = { ...character, max_hp: newMaxHp, current_hp: newCurrHp }
    if (asi?.feat) {
      // Feat chosen — add as ability item
      await supabase.from('inventory').insert({
        campaign_id: campaign.id, character_id: character.id,
        name: asi.feat, item_type: 'ability',
        description: `Feat chosen at level ${newLevel}.`,
        buff: 'Feat — discuss effects with the GM', quantity: 1, equipped: true,
      })
    } else if (asi?.stat1 !== null && asi?.stat1 !== undefined) {
      const key1 = ['str_stat','dex_stat','con_stat','int_stat','wis_stat','cha_stat'][asi.stat1]
      updates[key1] = Math.min(20, (character[key1] ?? 10) + (asi.mode === 'double' ? 2 : 1))
      updatedChar[key1] = updates[key1]
    }
    if (asi?.mode === 'split' && asi.stat2 !== null && asi.stat2 !== undefined) {
      const key2 = ['str_stat','dex_stat','con_stat','int_stat','wis_stat','cha_stat'][asi.stat2]
      updates[key2] = Math.min(20, (character[key2] ?? 10) + 1)
      updatedChar[key2] = updates[key2]
    }

    await supabase.from('characters').update(updates).eq('id', character.id)
    setCharacter(c => ({ ...c, ...updatedChar }))

    // Add new features as 'ability' inventory items
    const featuresToAdd = [...newFeatures]
    if (subclass)      featuresToAdd.push({ name: subclass, desc: 'Your chosen subclass path.', buff: 'Subclass chosen' })
    if (fightingStyle) featuresToAdd.push({ name: fightingStyle, desc: 'Your chosen fighting style.', buff: fightingStyle })

    for (const f of featuresToAdd) {
      const exists = inventory.find(i => i.name?.toLowerCase() === f.name?.toLowerCase())
      if (!exists) {
        await supabase.from('inventory').insert({
          campaign_id: campaign.id, character_id: character.id,
          name: f.name, item_type: 'ability',
          description: f.desc || f.description || '',
          buff: f.buff || '', quantity: 1, equipped: true,
        })
      }
    }

    // Refresh inventory
    const { data } = await supabase.from('inventory').select('*').eq('campaign_id', campaign.id).order('created_at')
    setInventory(data || [])
    setLevelUpQueue(q => {
      const next = q.slice(1)
      if (next.length === 0) setShowLevelUp(false)
      return next
    })
  }

  async function applyHP(hpUpdate) {
    if (!hpUpdate) return
    const current = Math.max(0, Math.min(hpUpdate.current ?? character.current_hp ?? 0, hpUpdate.max ?? character.max_hp ?? 0))
    const max     = hpUpdate.max ?? character.max_hp ?? 0
    await supabase.from('characters').update({ current_hp: current, max_hp: max }).eq('id', character.id)
    setCharacter(c => ({ ...c, current_hp: current, max_hp: max }))
  }

  async function applyAC(acUpdate) {
    if (!acUpdate?.value) return
    await supabase.from('characters').update({ ac_override: acUpdate.value }).eq('id', character.id)
    setCharacter(c => ({ ...c, ac_override: acUpdate.value }))
  }

  async function upsertInventoryItems(items) {
    if (!items?.length) return
    for (const item of items) {
      const { data: existing } = await supabase.from('inventory').select('id')
        .eq('campaign_id', campaign.id).ilike('name', item.name).maybeSingle()
      if (existing) {
        await supabase.from('inventory').update({
          item_type: item.type || 'item', description: item.description || '',
          buff: item.buff || '', quantity: item.quantity ?? 1, equipped: item.equipped ?? false,
        }).eq('id', existing.id)
      } else {
        await supabase.from('inventory').insert({
          campaign_id: campaign.id, character_id: character.id,
          name: item.name, item_type: item.type || 'item',
          description: item.description || '', buff: item.buff || '',
          quantity: item.quantity ?? 1, equipped: item.equipped ?? false,
        })
      }
    }
    const { data } = await supabase.from('inventory').select('*').eq('campaign_id', campaign.id).order('created_at')
    setInventory(data || [])
  }

  async function removeInventoryItems(items) {
    if (!items?.length) return
    for (const item of items) {
      await supabase.from('inventory').delete().eq('campaign_id', campaign.id).ilike('name', item.name)
    }
    const { data } = await supabase.from('inventory').select('*').eq('campaign_id', campaign.id).order('created_at')
    setInventory(data || [])
  }

  async function initStartingGear() {
    // Only seed if inventory is genuinely empty for this campaign
    if (inventory.length > 0) return
    const gear = STARTING_GEAR[character.class] || []
    if (!gear.length) return
    const rows = gear.map(item => ({
      ...item,
      campaign_id:  campaign.id,
      character_id: character.id,
    }))
    await supabase.from('inventory').insert(rows)
    const { data } = await supabase.from('inventory').select('*').eq('campaign_id', campaign.id).order('created_at')
    setInventory(data || [])
  }

  async function initRacialFeatures() {
    // Only seed once — skip if any feature-type inventory already exists
    const alreadyHas = inventory.some(i => i.item_type === 'feature')
    if (alreadyHas) return
    const features = RACIAL_FEATURES[character.race] || []
    if (!features.length) return
    const rows = features.map(f => ({ ...f, campaign_id: campaign.id, character_id: character.id }))
    await supabase.from('inventory').insert(rows)
    const { data } = await supabase.from('inventory').select('*').eq('campaign_id', campaign.id).order('created_at')
    setInventory(data || [])
  }

  async function getOpeningScene() {
    setError('')
    setTyping(true)
    // Seed starting gear + racial features + HP for new adventures
    await initStartingGear().catch(e => dbLog('initGear', e))
    await initRacialFeatures().catch(e => dbLog('initRacial', e))
    if (!character.max_hp) {
      const HIT_DICE = { Barbarian:12, Fighter:10, Paladin:10, Ranger:8, Bard:8, Cleric:8, Druid:8, Monk:8, Rogue:8, Warlock:8, Sorcerer:6, Wizard:6 }
      const conMod = mod(character.con_stat ?? 10)
      const maxHp  = Math.max(1, (HIT_DICE[character.class] ?? 8) + conMod)
      await supabase.from('characters').update({ max_hp: maxHp, current_hp: maxHp }).eq('id', character.id)
      setCharacter(c => ({ ...c, max_hp: maxHp, current_hp: maxHp }))
    }
    try {
      const gmRaw = await sendToGM([], character, { tier: profile?.subscription_tier, persona: gmPersona })
      const { roll, npcs: newNpcs, removeNpcs: deadNpcs, newQuests, completedQuests, xpAward, hpUpdate, acUpdate, newItems, removeItems } = parseGMMessage(gmRaw)
      const msg = { campaign_id: campaign.id, role: 'assistant', content: gmRaw }
      await supabase.from('campaign_messages').insert(msg)
      setMessages([{ ...msg, id: Date.now(), created_at: new Date().toISOString() }])
      if (roll) setPendingRoll(roll)
      upsertNpcs(newNpcs).catch(e => dbLog('upsertNpcs', e))
      deleteNpcs(deadNpcs).catch(e => dbLog('deleteNpcs', e))
      upsertQuests(newQuests, completedQuests).catch(e => dbLog('upsertQuests', e))
      if (xpAward)   awardXP(xpAward).catch(e => dbLog('awardXP', e))
      if (hpUpdate)  applyHP(hpUpdate).catch(e => dbLog('applyHP', e))
      if (acUpdate)  applyAC(acUpdate).catch(e => dbLog('applyAC', e))
      upsertInventoryItems(newItems).catch(e => dbLog('upsertItems', e))
      removeInventoryItems(removeItems).catch(e => dbLog('removeItems', e))
    } catch (e) {
      setError('The GM is unavailable right now. Please try again.')
    } finally {
      setTyping(false)
    }
  }

  // Called after player clicks Roll in the RollCard
  async function handleRollResult({ rolls, sum, bonus, total, roll }) {
    setPendingRoll(null)
    const label    = roll.label ?? roll.type
    const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`
    const statName = roll.stat ? (STAT_FULL[roll.stat] ?? roll.stat) : ''
    let resultMsg
    if (roll.type === 'attack') {
      // For attacks GM needs AC to determine hit — still include AC in result
      resultMsg = `[Roll Result: ${label} — 1d20${bonusStr} = ${total} vs AC ${roll.dc}]`
    } else if (roll.type === 'damage') {
      resultMsg = `[Roll Result: ${label} — ${roll.dice}${bonusStr} = ${total} damage]`
    } else {
      // Check/save: just report total — GM determines outcome from tiers
      resultMsg = `[Roll Result: ${label}${statName ? ` (${statName})` : ''} — ${roll.dice}${bonusStr} = ${total}]`
    }
    await submitTurn(resultMsg, true)
  }

  async function send() {
    if (!input.trim() || typing || coins < 1 || pendingRoll) return
    const text = input.trim()
    setInput('')
    await submitTurn(text, false)
  }

  async function submitTurn(userText, isRollResult) {
    setError('')
    const userMsg = {
      id: 'tmp-' + Date.now(), role: 'user', content: userText,
      campaign_id: campaign.id, created_at: new Date().toISOString(),
    }
    const nextMsgs = [...messages, userMsg]
    setMessages(nextMsgs)
    setTyping(true)

    try {
      // Deduct coin
      const newCoins = coins - 1
      const { error: coinErr } = await supabase.from('profiles').update({ coins: newCoins }).eq('id', session.user.id)
      if (coinErr) throw new Error('Could not deduct coins')
      setCoins(newCoins)
      onCoinsChanged()

      await supabase.from('campaign_messages').insert({ campaign_id: campaign.id, role: 'user', content: userText })

      const gmRaw  = await sendToGM(nextMsgs, character, { tier: profile?.subscription_tier, persona: gmPersona })
      const { roll, npcs: newNpcs, removeNpcs: deadNpcs, newQuests, completedQuests, xpAward, hpUpdate, acUpdate, newItems, removeItems } = parseGMMessage(gmRaw)

      await supabase.from('campaign_messages').insert({ campaign_id: campaign.id, role: 'assistant', content: gmRaw })
      await supabase.from('campaigns').update({ last_played_at: new Date().toISOString() }).eq('id', campaign.id)

      setMessages(prev => [
        ...prev.filter(m => m.id !== userMsg.id),
        { id: 'u-' + Date.now(), role: 'user', content: userText, campaign_id: campaign.id, created_at: new Date().toISOString() },
        { id: 'gm-' + Date.now(), role: 'assistant', content: gmRaw, campaign_id: campaign.id, created_at: new Date().toISOString() },
      ])
      if (roll) setPendingRoll(roll)
      upsertNpcs(newNpcs).catch(e => dbLog('upsertNpcs', e))
      deleteNpcs(deadNpcs).catch(e => dbLog('deleteNpcs', e))
      upsertQuests(newQuests, completedQuests).catch(e => dbLog('upsertQuests', e))
      if (xpAward)   awardXP(xpAward).catch(e => dbLog('awardXP', e))
      if (hpUpdate)  applyHP(hpUpdate).catch(e => dbLog('applyHP', e))
      if (acUpdate)  applyAC(acUpdate).catch(e => dbLog('applyAC', e))
      upsertInventoryItems(newItems).catch(e => dbLog('upsertItems', e))
      removeInventoryItems(removeItems).catch(e => dbLog('removeItems', e))
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
    } finally {
      setTyping(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Re-parse every stored GM message and retroactively upsert NPCs, quests, inventory
  async function rescanMessages() {
    const gmMessages = messages.filter(m => m.role === 'assistant')
    if (!gmMessages.length) { dbLog('rescan', { message: 'No GM messages to scan' }); return }
    dbLog('rescan', { message: `Scanning ${gmMessages.length} GM messages…` })

    const allNpcs = {}      // name.lower → npc object (last-seen wins)
    const allQuests = {}    // title.lower → quest object
    const newItems = []

    for (const m of gmMessages) {
      const { npcs, newQuests, completedQuests, newItems: items } = parseGMMessage(m.content)
      for (const n of (npcs || []))        allNpcs[n.name.toLowerCase()] = n
      for (const q of (newQuests || []))   allQuests[q.title.toLowerCase()] = q
      for (const i of (items || []))       newItems.push(i)
    }

    const npcList   = Object.values(allNpcs)
    const questList = Object.values(allQuests)

    dbLog('rescan', { message: `Found ${npcList.length} NPC(s), ${questList.length} quest(s), ${newItems.length} item(s)` })

    if (npcList.length)   await upsertNpcs(npcList).catch(e => dbLog('rescan:upsertNpcs', e))
    if (questList.length) await upsertQuests(questList, []).catch(e => dbLog('rescan:upsertQuests', e))
    if (newItems.length)  await upsertInventoryItems(newItems).catch(e => dbLog('rescan:upsertItems', e))

    dbLog('rescan', { message: 'Done ✓' })
  }

  if (!loaded) return <div className="empty-state">Loading adventure...</div>

  const canSend = input.trim() && !typing && coins >= 1 && !pendingRoll && !pendingLevelUp

  return (
    <>
    <div>
      {/* XP gain toast */}
      {xpGain && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 999,
          background: xpGain.leveledUp ? 'var(--gold)' : 'var(--surface2)',
          color: xpGain.leveledUp ? '#1a1200' : 'var(--text)',
          border: `1px solid ${xpGain.leveledUp ? 'var(--gold)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', padding: '12px 18px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          fontSize: '0.88rem', maxWidth: '260px', animation: 'fadeInUp 0.25s ease',
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '2px' }}>
            {xpGain.leveledUp ? `⭐ Level Up! Now Level ${xpGain.newLevel}` : `+${xpGain.amount} XP`}
          </div>
          {xpGain.reason && <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>{xpGain.reason}</div>}
          {xpGain.leveledUp && <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>+{xpGain.amount} XP</div>}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <h2 style={{ margin: 0, textShadow: '0 0 16px var(--gold-glow)', flex: 1 }}>{campaign.title}</h2>
        {isDevUser && (
          <button
            className={`btn btn-sm ${debugMode ? 'btn-danger' : 'btn-ghost'}`}
            style={{ fontFamily: 'monospace', fontSize: '0.72rem', opacity: debugMode ? 1 : 0.5 }}
            onClick={() => setDebugMode(d => !d)}
            title="Toggle dev tools panel"
          >
            {debugMode ? '🐛 ON' : '🐛'}
          </button>
        )}
      </div>

      <div className="campaign-layout" style={debugMode ? { gridTemplateColumns: '250px 1fr 300px' } : {}}>
        {/* Sidebar */}
        <div className="campaign-sidebar">
          {/* Pill tabs */}
          <div className="side-tabs">
            {[
              { key: 'stats',     label: 'Stats' },
              { key: 'inventory', label: `Inv${inventory.length ? ` (${inventory.length})` : ''}` },
              { key: 'quests',    label: `Quests${quests.filter(q => q.status === 'active').length ? ` (${quests.filter(q => q.status === 'active').length})` : ''}` },
              { key: 'chars',     label: `NPCs${npcs.length ? ` (${npcs.length})` : ''}` },
            ].map(({ key, label }) => (
              <button key={key} className={`side-tab${sideTab === key ? ' active' : ''}`} onClick={() => setSideTab(prev => prev === key ? null : key)}>
                {label}
              </button>
            ))}
          </div>
          {sideTab !== null && (
          <div className="sidebar-scroll">

          {/* ── Stats Tab ───────────────────────────────────────────── */}
          {sideTab === 'stats' && (<>
            {/* Character header — always visible */}
            <p className="sidebar-char-name">{character.name}</p>
            <p className="sidebar-char-meta">Level {character.level} {character.race} {character.class}</p>
            <p className="sidebar-char-bg">{character.background}</p>

            {/* HP bar — always visible */}
            {character.max_hp > 0 && (() => {
              const cur = character.current_hp ?? 0; const max = character.max_hp
              const pct = Math.max(0, Math.min(100, (cur / max) * 100))
              const col = pct > 50 ? 'var(--green)' : pct > 25 ? 'var(--gold)' : 'var(--red)'
              return (
                <div className="hp-bar-wrap">
                  <div className="hp-bar-header">
                    <span className="hp-bar-label">❤️ HP</span>
                    <span className="hp-bar-value" style={{ color: col }}>{cur} / {max}</span>
                  </div>
                  <div className="hp-bar-track">
                    <div className="hp-bar-fill" style={{ width: `${pct}%`, background: col, boxShadow: `0 0 6px ${col}` }} />
                  </div>
                </div>
              )
            })()}

            {/* Combat stats — always visible */}
            <div className="combat-stats">
              {[
                { label: '🛡️ AC',   val: calcAC(character, inventory) },
                { label: '⚡ Init',  val: modStr(mod(character.dex_stat ?? 10)) },
                { label: '📖 Prof', val: `+${character.prof_bonus_override ?? profBonus(character.level ?? 1)}` },
              ].map(({ label, val }) => (
                <div key={label} className="combat-stat-box">
                  <div className="combat-stat-label">{label}</div>
                  <div className="combat-stat-value">{val}</div>
                </div>
              ))}
            </div>

            {/* XP bar — always visible */}
            {(() => {
              const lvl = character.level ?? 1
              const prog = xpProgress(character.xp ?? 0, lvl)
              const maxed = lvl >= 20
              return (
                <div className="xp-bar-wrap" style={{ marginBottom: '8px' }}>
                  <div className="xp-bar-header">
                    <span className="xp-bar-level">⭐ Level {lvl}{maxed ? ' · MAX' : ''}</span>
                    <span className="xp-bar-numbers">
                      {maxed ? `${fmtXP(character.xp ?? 0)} XP` : `${fmtXP(prog.current)} / ${fmtXP(prog.needed)}`}
                    </span>
                  </div>
                  <div className="xp-bar-track">
                    <div className="xp-bar-fill" style={{ width: `${prog.pct}%`, background: maxed ? 'var(--green)' : 'var(--gold)', boxShadow: maxed ? '0 0 6px var(--green)' : '0 0 8px var(--gold-glow)' }} />
                  </div>
                </div>
              )
            })()}

            {/* Collapsible: Saving Throws */}
            <CollapsibleSection label="Saving Throws" sectionKey="saves" collapsed={collapsedSections.has('saves')} onToggle={toggleSection}>
              <div className="saves-grid">
                {STAT_NAMES.map((s, i) => (
                  <div key={s} className="save-row">
                    <span className="save-abbr">{s}</span>
                    <span className="save-val">{modStr(mod(character[STAT_KEYS[i]] ?? 10))}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Collapsible: Skills */}
            <CollapsibleSection label="Skills" sectionKey="skills" collapsed={collapsedSections.has('skills')} onToggle={toggleSection}>
              {SKILLS.map(sk => {
                const bonus = mod(character[sk.key] ?? 10)
                return (
                  <div key={sk.name} className="skill-row">
                    <span className="skill-name">{sk.name}<span className="skill-abbr">({sk.abbr})</span></span>
                    <span className="skill-val" style={{ color: bonus < 0 ? 'var(--red)' : 'var(--text)' }}>{modStr(bonus)}</span>
                  </div>
                )
              })}
            </CollapsibleSection>

            {/* Collapsible: Ability Scores */}
            <CollapsibleSection label="Ability Scores" sectionKey="abilities" collapsed={collapsedSections.has('abilities')} onToggle={toggleSection}>
              <div className="ability-grid">
                {STAT_NAMES.map((s, i) => (
                  <div key={s} className="ability-box">
                    <div className="ability-name">{s}</div>
                    <div className="ability-score">{character[STAT_KEYS[i]] ?? 10}</div>
                    <div className="ability-mod">{modStr(mod(character[STAT_KEYS[i]] ?? 10))}</div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </>)}

          {/* ── Inventory Tab ───────────────────────────────────────── */}
          {sideTab === 'inventory' && (<>
            {/* Items / Abilities sub-tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>
              {[['items','🎒 Items'],['abilities','⚡ Abilities']].map(([t,label]) => (
                <button key={t} onClick={() => setInventoryTab(t)}
                  style={{ flex:1, background:'none', border:'none', padding:'8px 4px',
                    fontSize:'0.75rem', cursor:'pointer', color: inventoryTab===t ? 'var(--gold)' : 'var(--text-dim)',
                    borderBottom: inventoryTab===t ? '2px solid var(--gold)' : '2px solid transparent',
                    fontWeight: inventoryTab===t ? 'bold' : 'normal', transition:'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>

            {inventoryTab === 'items' && (() => {
              const items = inventory.filter(i => !['ability','feature','spell'].includes(i.item_type))
              if (!items.length) return <p className="empty-state" style={{ padding:'16px 0', fontSize:'0.82rem' }}>Your pack is empty.</p>
              return ['weapon','armor','item','other'].map(type => {
                const group = items.filter(i => i.item_type === type)
                if (!group.length) return null
                const labels = { weapon:'⚔️ Weapons', armor:'🛡️ Armor', item:'🎒 Items', other:'📦 Other' }
                const sk = `inv-${type}`
                const isCollapsed = collapsedSections.has(sk)
                return (
                  <div key={type} className="inv-type-section">
                    <div className="inv-type-header clickable" onClick={() => toggleSection(sk)}>
                      <span>{labels[type]}</span>
                      <span className={`section-chevron${isCollapsed ? '' : ' open'}`}>▸</span>
                    </div>
                    {!isCollapsed && group.map(item => {
                      const expanded = expandedItems.has(item.id)
                      return (
                        <div key={item.id} className="inv-card expandable" onClick={() => toggleItem(item.id)}>
                          <div className="inv-card-header">
                            <span className="inv-card-name">{item.name}</span>
                            <span className="inv-card-qty">
                              {item.equipped && <span className="inv-card-equipped">EQ</span>}
                              {item.quantity > 1 && <span style={{ marginLeft:'3px' }}>×{item.quantity}</span>}
                              <span className={`expand-arrow${expanded ? ' open' : ''}`}>›</span>
                            </span>
                          </div>
                          {expanded && <div className="inv-card-details">
                            {item.description && <div className="inv-card-desc">{item.description}</div>}
                            {item.buff && <div className="inv-card-buff">{item.buff}</div>}
                          </div>}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            })()}

            {inventoryTab === 'abilities' && (() => {
              const abilities = inventory.filter(i => ['ability','feature','spell'].includes(i.item_type))
              if (!abilities.length) return <p className="empty-state" style={{ padding:'16px 0', fontSize:'0.82rem' }}>No abilities yet. Level up to gain class features.</p>
              return abilities.map(item => {
                const expanded = expandedItems.has(item.id)
                return (
                  <div key={item.id} className="inv-card expandable" onClick={() => toggleItem(item.id)}>
                    <div className="inv-card-header">
                      <span className="inv-card-name" style={{ color:'var(--gold)' }}>{item.name}</span>
                      <span className={`expand-arrow${expanded ? ' open' : ''}`}>›</span>
                    </div>
                    {expanded && <div className="inv-card-details">
                      {item.description && <div className="inv-card-desc">{item.description}</div>}
                      {item.buff && <div className="inv-card-buff">{item.buff}</div>}
                    </div>}
                  </div>
                )
              })
            })()}
          </>)}

          {/* ── Quests Tab ──────────────────────────────────────────── */}
          {sideTab === 'quests' && (<>
            {quests.length === 0
              ? <p className="empty-state" style={{ padding: '24px 0', fontSize: '0.82rem' }}>No quests yet. Your story is just beginning…</p>
              : (<>
                  {(() => {
                    const active = quests.filter(q => q.status === 'active')
                    if (!active.length) return null
                    const isCollapsed = collapsedSections.has('quests-active')
                    return (
                      <div className="inv-type-section">
                        <div className="inv-type-header clickable" onClick={() => toggleSection('quests-active')}>
                          <span>📜 Active</span>
                          <span className={`section-chevron${isCollapsed ? '' : ' open'}`}>▸</span>
                        </div>
                        {!isCollapsed && active.map(q => {
                          const expanded = expandedItems.has(q.id)
                          return (
                            <div key={q.id} className="inv-card quest-active expandable" onClick={() => toggleItem(q.id)}>
                              <div className="inv-card-header">
                                <div className="inv-card-name">{q.title}</div>
                                <span className={`expand-arrow${expanded ? ' open' : ''}`}>›</span>
                              </div>
                              {expanded && q.description && (
                                <div className="inv-card-details">
                                  <div className="inv-card-desc">{q.description}</div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                  {(() => {
                    const done = quests.filter(q => q.status === 'completed')
                    if (!done.length) return null
                    const isCollapsed = collapsedSections.has('quests-completed')
                    return (
                      <div className="inv-type-section">
                        <div className="inv-type-header clickable" style={{ color: 'var(--green)' }} onClick={() => toggleSection('quests-completed')}>
                          <span>✅ Completed</span>
                          <span className={`section-chevron${isCollapsed ? '' : ' open'}`}>▸</span>
                        </div>
                        {!isCollapsed && done.map(q => {
                          const expanded = expandedItems.has(q.id)
                          return (
                            <div key={q.id} className="inv-card quest-completed expandable" onClick={() => toggleItem(q.id)}>
                              <div className="inv-card-header">
                                <div className="inv-card-name">✓ {q.title}</div>
                                <span className={`expand-arrow${expanded ? ' open' : ''}`}>›</span>
                              </div>
                              {expanded && q.description && (
                                <div className="inv-card-details">
                                  <div className="inv-card-desc">{q.description}</div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </>)
            }
          </>)}

          {/* ── NPCs Tab ────────────────────────────────────────────── */}
          {sideTab === 'chars' && (<>
            {npcs.length === 0
              ? <p className="empty-state" style={{ padding: '24px 0', fontSize: '0.82rem' }}>No characters met yet. They'll appear as your story unfolds.</p>
              : ['friend','foe','neutral'].map(type => {
                  const group = npcs.filter(n => n.type === type)
                  if (!group.length) return null
                  const cfg = { friend: { label:'🤝 Allies', cls:'npc-friend' }, foe: { label:'⚔️ Enemies', cls:'npc-foe' }, neutral: { label:'🔵 Others', cls:'npc-neutral' } }
                  const sk = `npc-${type}`
                  const isCollapsed = collapsedSections.has(sk)
                  return (
                    <div key={type} className={`inv-type-section ${cfg[type].cls}`}>
                      <div className="inv-type-header clickable" onClick={() => toggleSection(sk)}>
                        <span>{cfg[type].label}</span>
                        <span className={`section-chevron${isCollapsed ? '' : ' open'}`}>▸</span>
                      </div>
                      {!isCollapsed && group.map(npc => {
                        const expanded = expandedItems.has(npc.id)
                        return (
                          <div key={npc.id} className="inv-card expandable" onClick={() => toggleItem(npc.id)}>
                            <div className="inv-card-header">
                              <div className="inv-card-name">{npc.name}</div>
                              <span className={`expand-arrow${expanded ? ' open' : ''}`}>›</span>
                            </div>
                            {expanded && (
                              <div className="inv-card-details">
                                {npc.description && <div className="inv-card-desc">{npc.description}</div>}
                                {npc.known_info && <div className="inv-card-buff" style={{ color: 'var(--text-mid)' }}>{npc.known_info}</div>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })
            }
          </>)}

          </div>
          )}{/* end sidebar-scroll */}
        </div>

        {/* Chat */}
        <div className="campaign-main">
          <div className="messages-wrap">
            {/* Begin adventure prompt */}
            {messages.length === 0 && !typing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', padding: '48px 24px', gap: '14px' }}>
                <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 16px rgba(212,168,67,0.5))' }}>⚔️</div>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', textAlign: 'center', maxWidth: '300px', lineHeight: '1.6' }}>
                  Your adventure awaits,{' '}
                  <strong style={{ color: 'var(--gold-bright)', textShadow: '0 0 10px var(--gold-glow)' }}>{character?.name}</strong>.<br />
                  Step into the unknown.
                </p>
                {error && <p style={{ color: 'var(--red)', fontSize: '0.8rem', textAlign: 'center' }}>{error}</p>}
                {profile?.subscription_tier === 'archmage' && (
                  <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>🔮 GM Persona</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {GM_PERSONAS.map(p => (
                        <button key={p.id} onClick={() => setGmPersona(p.id)}
                          title={p.desc}
                          style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '14px', cursor: 'pointer',
                            background: gmPersona === p.id ? 'var(--gold)' : 'var(--surface2)',
                            color: gmPersona === p.id ? '#1a1200' : 'var(--text-dim)',
                            border: `1px solid ${gmPersona === p.id ? 'var(--gold)' : 'var(--border)'}`,
                            fontWeight: gmPersona === p.id ? 'bold' : 'normal' }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button className="btn btn-gold" style={{ padding: '12px 36px', fontSize: '1rem', marginTop: '4px' }} onClick={getOpeningScene}>
                  {error ? '🎲 Try Again' : '🎲 Begin Adventure'}
                </button>
              </div>
            )}

            {messages.filter(m => m.role !== 'system').map(m => {
              if (m.role === 'assistant') {
                const { text } = parseGMMessage(m.content)
                return (
                  <div key={m.id} className="message-gm">
                    <div className="msg-label">🎲 Dungeon Master</div>
                    <div className="msg-body">{renderMarkdown(text)}</div>
                  </div>
                )
              }
              return (
                <div key={m.id} className="message-player">
                  <div className="msg-label">⚔️ You</div>
                  <div className="msg-body">{m.content}</div>
                </div>
              )
            })}

            {/* Pending roll card */}
            {pendingRoll && !typing && (
              <RollCard roll={pendingRoll} character={character} onRolled={handleRollResult} riggedRoll={riggedRoll} />
            )}

            {typing && (
              <div className="message-gm">
                <div className="msg-label">🎲 Dungeon Master</div>
                <div className="msg-typing">The GM is weaving your fate…</div>
              </div>
            )}
            {error && messages.length > 0 && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginTop: '8px' }}>{error}</div>}
            <div ref={bottomRef} />
          </div>

          {messages.length > 0 && (
            <div className="input-bar">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  pendingLevelUp    ? '⬆ Level up before continuing your adventure!'
                  : pendingRoll     ? 'Roll the dice above before continuing…'
                  : coins < 1      ? 'No coins remaining — visit Upgrade to continue.'
                  : 'What do you do? (Enter to send, Shift+Enter for newline)'
                }
                disabled={typing || coins < 1 || !!pendingRoll || pendingLevelUp}
                style={pendingLevelUp ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              />
              <div className="send-col">
                {pendingLevelUp
                  ? <button className="btn btn-gold btn-sm" onClick={() => setShowLevelUp(true)} style={{ animation: 'pulse 1.5s infinite', whiteSpace:'nowrap' }}>⬆ Level Up!</button>
                  : <button className="btn btn-gold btn-sm" onClick={send} disabled={!canSend}>Send</button>
                }
                <span className="coins-cost">🪙 1 coin</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Dev Tools Panel (dev user only) ─────────────────────── */}
        {debugMode && isDevUser && character && (
          <DevTools
            character={character}
            riggedRoll={riggedRoll}
            setRiggedRoll={setRiggedRoll}
            devXpInput={devXpInput}
            setDevXpInput={setDevXpInput}
            devStatEdit={devStatEdit}
            setDevStatEdit={setDevStatEdit}
            onAddXp={async (amt) => {
              const newXp = (character.xp ?? 0) + amt
              await supabase.from('characters').update({ xp: newXp }).eq('id', character.id)
              setCharacter(c => ({ ...c, xp: newXp }))
              // check level
              const newLevel = xpToLevel(newXp)
              const oldLvl = character.level ?? 1
              if (newLevel > oldLvl) {
                await supabase.from('characters').update({ level: newLevel }).eq('id', character.id)
                setCharacter(c => ({ ...c, level: newLevel }))
                const q = []
                for (let l = oldLvl + 1; l <= newLevel; l++) q.push(l)
                setLevelUpQueue(q)
              }
            }}
            onSetStat={async (key, val) => {
              await supabase.from('characters').update({ [key]: val }).eq('id', character.id)
              setCharacter(c => ({ ...c, [key]: val }))
            }}
            onSetProfBonus={async (val) => {
              await supabase.from('characters').update({ prof_bonus_override: val }).eq('id', character.id)
              setCharacter(c => ({ ...c, prof_bonus_override: val }))
            }}
            onSetMaxHp={async (val) => {
              await supabase.from('characters').update({ max_hp: val }).eq('id', character.id)
              setCharacter(c => ({ ...c, max_hp: val }))
            }}
          />
        )}

        {/* ── Debug Panel (raw AI output) ──────────────────────────── */}
        {debugMode && (
          <div style={{
            background: '#0a0a12', border: '1px solid #2a2a50',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            {/* Header */}
            <div style={{
              padding: '8px 12px', background: '#111122',
              borderBottom: '1px solid #2a2a50',
              fontSize: '0.65rem', color: '#5555cc', textTransform: 'uppercase',
              letterSpacing: '0.1em', fontFamily: 'monospace', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>🐛 Debug</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  style={{ fontSize: '0.6rem', fontFamily: 'monospace', background: '#1a2a1a', border: '1px solid #337733', color: '#55cc55', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
                  onClick={rescanMessages}
                >↺ Rescan</button>
                <button
                  style={{ fontSize: '0.6rem', fontFamily: 'monospace', background: '#1a1a40', border: '1px solid #3333aa', color: '#8888ff', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
                  onClick={async () => {
                    const tables = ['campaign_npcs', 'quests', 'inventory', 'characters', 'campaign_messages']
                    for (const t of tables) {
                      const { error } = await supabase.from(t).select('id').limit(1)
                      dbLog(`TABLE ${t}`, error ? error : { message: 'OK ✓' })
                    }
                  }}
                >Check Tables</button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* Error log */}
              {debugLog.length > 0 && (
                <div style={{ borderBottom: '1px solid #2a2a50' }}>
                  <div style={{ padding: '4px 10px', fontSize: '0.55rem', color: '#aa3333', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace', background: '#150a0a' }}>
                    ⚠ DB Errors / Log
                  </div>
                  <div style={{ padding: '6px 10px' }}>
                    {debugLog.map((e, i) => (
                      <div key={i} style={{ fontSize: '0.62rem', color: e.includes('OK ✓') ? '#44aa44' : '#cc4444', fontFamily: 'monospace', marginBottom: '2px', lineHeight: 1.4 }}>
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw AI messages */}
              <div style={{ padding: '10px' }}>
                <div style={{ fontSize: '0.55rem', color: '#444466', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace', marginBottom: '6px' }}>
                  Raw AI Output (newest first)
                </div>
                {messages.filter(m => m.role === 'assistant').length === 0
                  ? <p style={{ color: '#333355', fontSize: '0.72rem', fontFamily: 'monospace', fontStyle: 'italic' }}>No GM messages yet.</p>
                  : [...messages].reverse().filter(m => m.role === 'assistant').map((m, i) => {
                      const gmCount = messages.filter(x => x.role === 'assistant').length
                      return (
                        <div key={m.id ?? i} style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '0.56rem', color: '#444466', fontFamily: 'monospace', marginBottom: '3px', borderBottom: '1px solid #1a1a33', paddingBottom: '2px' }}>
                            MSG {gmCount - i} · {m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}
                          </div>
                          <pre style={{ fontSize: '0.66rem', color: '#7777bb', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, margin: 0 }}>
                            {m.content}
                          </pre>
                        </div>
                      )
                    })
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Level-up overlay */}
    {showLevelUp && character && levelUpQueue.length > 0 && (
      <LevelUp
        character={character}
        newLevel={levelUpQueue[0]}
        remaining={levelUpQueue.length}
        onComplete={applyLevelUp}
      />
    )}
  </>
  )
}
