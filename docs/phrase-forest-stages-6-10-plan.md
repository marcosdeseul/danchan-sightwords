# Phrase Forest Plan: Stages 6-10

Status: First playable implementation plus detailed product and curriculum plan

Parent plan: [Reading Game Master Plan](reading-game-master-plan.md)

Scope: The first half of Phrase Forest, beginning after the existing 1,000-word
foundation and ending with static location phrases

Implementation note (2026-07-21): the shared content model, 375 validated
phrases, 100 core missions, world navigation, phrase matching and building,
Discover modeling, accessible scene descriptions, item-level evidence,
persistent success feedback, stage-specific mission presentation, progressive
forest restoration, five companion rewards, and independent checkpoints paced
across separate reading sessions are implemented. Child playtesting should now
guide the next delivery pass: editorial phrase review, richer authored
illustration and animation assets, adaptive review insertion, and cadence
tuning.

## 1. Outcome

Stages 6-10 teach children to stop treating familiar words as isolated cards and
start reading small groups of words as meaningful units.

The progression is intentionally narrow:

> pair familiar words -> understand descriptions -> read actions -> connect
> actions to objects -> understand locations.

These five stages do not attempt to teach complete sentences. They establish the
phrase-reading behaviors required for Stages 11-15 and later Sentence City.

## 2. Scope and boundaries

### Included

- Meaningful phrases containing two to four familiar words
- Phrase-to-picture and phrase-to-action understanding
- Word-tile construction
- Natural left-to-right phrase reading
- Optional phrase and individual-word audio help
- Spaced rereading with progressively reduced support
- Fresh checkpoint phrases assembled from known words

### Deliberately deferred

- Complete sentences
- Capitalization and sentence-ending punctuation
- Movement and direction phrases, which begin in Stage 11
- Time phrases, which begin in Stage 12
- Long noun and action phrases, which begin in Stages 13-14
- Automatic speech-recognition scoring
- Reading-speed gates
- New vocabulary instruction beyond the existing 1,000-word foundation

## 3. Stage size and cadence

Each stage contains 20 core missions divided into four five-mission chapters.
Adaptive review missions may be inserted without changing the stage number.

| Chapter | Missions | Default support | Purpose |
| --- | ---: | --- | --- |
| Discover | 1-5 | Automatic modeling and strong visual support | Establish the new phrase relationship |
| Practice | 6-10 | Help available on request | Read, match, and construct varied examples |
| Apply | 11-15 | No automatic audio; mixed prior-stage review | Use the phrase to change the forest world |
| Prove | 16-20 | Minimal default support and fresh examples | Demonstrate understanding across separate sessions |

A child is not expected to finish a stage in one sitting. The product should
spread independent checkpoints across at least three separate reading sessions.
Mission length should target a short, focused child session rather than a fixed
number of minutes.

Each stage needs an authored bank of at least:

- 60 curriculum phrases for guided, supported, and mixed practice; and
- 15 reserved checkpoint phrases that do not appear in earlier missions.

The exact bank sizes are initial production targets and may grow after
playtesting. Reserved checkpoint content prevents memorization from looking like
transfer.

## 4. Phrase Forest game loop

### World state

The player arrives in a disconnected forest. Broken paths, sleeping plants, and
lost animals show that words exist but no longer connect. Every phrase-reading
action visibly reconnects or restores part of the environment.

### Mission loop

1. A forest character presents a concrete need.
2. The child reads, matches, builds, or follows a phrase.
3. The phrase directly changes an object, action, or location in the scene.
4. Incorrect choices receive a semantic explanation and another example.
5. Completion restores one visible part of the current stage area.
6. Previously difficult phrases return later in a different activity.

### Reward rhythm

- Every mission restores a small environmental detail.
- Every five missions completes one forest landmark or habitat section.
- Every stage capstone unlocks one animal companion.
- Every completed stage restores one Great Library page.
- Rereading with less help grows optional cosmetic plants and decorations.

There are no consumable lives and no reward is removed after an error.

### Stage-area rewards

| Stage | Forest area | Permanent restoration | Companion reward |
| ---: | --- | --- | --- |
| 6 | First Crossing | Forest footbridge | Fox |
| 7 | Color Garden | Descriptive flower garden | Butterfly |
| 8 | Action Clearing | Interactive play meadow | Rabbit |
| 9 | Keeper's Workshop | Forest repair workshop | Beaver |
| 10 | Hidden Grove | Treehouse and animal shelters | Owl |

Animal choices are working art direction. They may change, but each stage keeps
one companion reward and one permanently restored area.

## 5. Shared learning interactions

### Phrase reveal

The phrase appears beside a scene. In Discover missions, the app reads the whole
phrase and highlights it as one unit. It does not bounce through words in a way
that encourages isolated reading.

### Meaning match

The child reads a phrase and chooses between visually controlled alternatives.
Distractors differ on the meaning-bearing word:

- `my book` versus `your book`;
- `red ball` versus `blue ball`;
- `can run` versus `can walk`; or
- `under the table` versus `on the table`.

The illustration must not allow the child to answer from the first word alone.

### Phrase builder

The child arranges two to four word tiles. Early missions provide only the
necessary tiles. Later missions add one meaningful distractor and require the
child to verify the resulting meaning against the scene.

### Scene controller

The phrase becomes a command to the game world. The child selects an action,
object, attribute, or location. This is the primary evidence that the phrase was
understood.

### Audio help

- Play Phrase reads the complete phrase naturally.
- Tapping one word reads only that word and briefly highlights it.
- Help use is recorded for support planning but never shown as a penalty.
- Independent checkpoints do not autoplay audio, but help remains available.

### Reread

Familiar phrases return with a changed picture, character, or activity. A child
earns the optional growth reward by understanding the phrase with less support,
not by beating a timer.

## 6. Mastery evidence

Stage readiness is based on three evidence categories:

1. **Construction:** Can the child place familiar words into the intended phrase?
2. **Meaning:** Can the child connect a fresh phrase to the correct scene or action?
3. **Independence:** Does the child use less automatic or requested support across
   several encounters?

The first implementation should use a transparent readiness rule:

- complete the four stage chapters;
- complete three fresh checkpoint missions across separate sessions;
- demonstrate both construction and meaning in those checkpoints; and
- finish the stage capstone.

If the child uses help or answers incorrectly, the checkpoint remains practice
and a different fresh checkpoint is scheduled later. There is no visible fail
state and no time limit.

Exact accuracy thresholds should be established through child playtesting. The
system should store item-level evidence so a future threshold change does not
erase or reinterpret the child's underlying history.

## 7. Stage 6: Two-Word Groups

### Learning outcome

The child reads two familiar words together and understands that the first word
changes which person, thing, amount, or instance the phrase refers to.

### Content scope

- article or determiner plus noun;
- possessive word plus noun;
- demonstrative word plus noun; and
- number or quantity word plus noun.

Descriptions such as `red ball` are reserved for Stage 7. Actions are reserved
for Stage 8.

### Starter phrase bank

`the dog`, `the house`, `a book`, `a car`, `my mother`, `my hand`, `your name`,
`your home`, `his father`, `his book`, `her family`, `her room`, `our school`,
`our world`, `their house`, `their children`, `this word`, `this day`, `that
boy`, `that place`, `these birds`, `those people`, `one night`, `two feet`,
`three birds`, `some water`, `many people`, `more time`, `each child`, `another
way`.

All production phrases must be checked against the existing 1,000-word content
and reviewed for naturalness. The starter bank illustrates categories; it is not
the full 75-item production bank.

### Mission chapters

| Chapter | Learning work | Forest play |
| --- | --- | --- |
| Discover | Hear and match article/determiner plus noun groups | Find the correct materials for the broken bridge |
| Practice | Build possessive, demonstrative, and quantity groups | Give forest characters the correct objects and supplies |
| Apply | Distinguish controlled contrasts such as `my book` and `your book` | Place bridge pieces owned or requested by different characters |
| Prove | Read and build unseen two-word groups without autoplay | Cross the completed bridge through five fresh phrase gates |

### Common errors and responses

- **Reads only the noun:** Present two scenes with the same noun but different
  owners or quantities.
- **Guesses from the picture:** Show the text before revealing the alternatives.
- **Reads words separately:** Replay the whole phrase naturally, then invite a
  whole-phrase reread without requiring vocal scoring.
- **Confuses `this` and `that`:** Use consistent near/far visual contrasts before
  varying the context.

### Capstone

Build the First Crossing. The child completes five gates using fresh two-word
groups: two meaning matches, two phrase builds, and one mixed scene interaction.
The repaired bridge becomes a permanent Phrase Forest landmark and the Fox joins
the player.

## 8. Stage 7: Describing Phrases

### Learning outcome

The child understands that a describing word changes which object, animal,
person, or scene a phrase identifies.

### Content scope

- color plus noun;
- size or length plus noun;
- temperature, light, or condition plus noun; and
- age or general quality plus noun.

The focus is meaning-bearing contrast, not teaching grammatical labels such as
adjective.

### Starter phrase bank

`red ball`, `blue sky`, `green grass`, `black horse`, `white birds`, `yellow
flowers`, `little dog`, `big house`, `small town`, `tall tree`, `long road`,
`short line`, `deep water`, `wide river`, `hot fire`, `cold water`, `warm day`,
`dark night`, `bright light`, `quiet room`, `old man`, `young girl`, `new book`,
`good day`, `happy child`, `beautiful flowers`, `heavy box`, `clean room`, `dry
ground`, `wild animal`.

### Mission chapters

| Chapter | Learning work | Forest play |
| --- | --- | --- |
| Discover | Read high-contrast color, size, and temperature phrases | Wake flowers and repaint faded garden objects |
| Practice | Match descriptions while the noun stays constant | Choose the exact seed, stone, animal, or tool requested |
| Apply | Build descriptive phrases and compare near alternatives | Restore themed garden beds from written labels |
| Prove | Interpret unseen descriptions without autoplay | Complete a garden scavenger hunt using only phrase clues |

### Visual-control requirements

- At least half of meaning matches keep the noun identical and change the
  describing word.
- Some later matches keep the describing word identical and change the noun.
- Color cannot be the only describing category.
- Illustrations must represent size, temperature, condition, age, and light
  clearly without stereotypes about people.

### Common errors and responses

- **Chooses by noun only:** Hold the noun constant across choices.
- **Overrelies on color:** Rotate non-color descriptions more frequently.
- **Reverses word order:** Let the child compare the built phrase with a modeled
  natural phrase, then rebuild it.
- **Memorizes an illustration:** Reuse the phrase with a different object pose or
  scene.

### Capstone

Restore the Color Garden. Five fresh descriptive phrases determine which plants
grow in five locations. The final panorama includes multiple objects with the
same nouns, so the child must read the describing word. The Butterfly joins the
player.

## 9. Stage 8: Action Phrases

### Learning outcome

The child reads a short action phrase as one unit and connects it to the correct
movement or behavior.

### Content scope

- helper word plus action, such as `can run` or `will go`;
- action plus direction or completion word, such as `came back` or `look down`;
- action plus simple manner word, such as `walk slowly`; and
- short social actions, such as `help me` or `come here`.

Actions applied to explicit objects are reserved for Stage 9.

### Starter phrase bank

`can run`, `can play`, `can help`, `will go`, `will come`, `will work`, `could
fly`, `should stop`, `came back`, `went away`, `look down`, `look up`, `stand
up`, `turn around`, `move forward`, `walk slowly`, `work carefully`, `listen
carefully`, `read again`, `write again`, `play outside`, `go inside`, `come
here`, `help me`, `follow me`, `try again`, `wait here`, `sing together`, `eat
together`, `feel better`.

### Mission chapters

| Chapter | Learning work | Forest play |
| --- | --- | --- |
| Discover | Match highly distinct actions to short phrases | Wake the Action Clearing and teach the Rabbit new movements |
| Practice | Distinguish the same helper with different actions and the same action with different modifiers | Run an animal practice course from phrase cards |
| Apply | Build action phrases and use them without picture-first cues | Activate meadow objects and companion animations |
| Prove | Read unseen action phrases and choose the correct animation | Complete a mixed action course with minimal support |

### Animation requirements

- Incorrect animations must be plausible contrasts, not obviously silly choices.
- The character should not move before the phrase is visible.
- Repeat animations should vary character or setting so the child cannot memorize
  one clip.
- Motion should respect reduced-motion accessibility settings.

### Common errors and responses

- **Reads only the action:** Contrast `can run` with `will run`, or `run away`
  with `run back`, when developmentally appropriate.
- **Chooses from animation alone:** Delay animation choices until after the phrase
  has been shown.
- **Confuses direction words:** Return the item later with a new character and
  clearer spatial framing.
- **Needs the whole phrase read repeatedly:** Offer word-level help, then replay
  the complete natural phrase once.

### Capstone

Restore the Action Clearing. The child guides the Rabbit through five fresh
action stations. Correct phrase understanding, rather than timing or motor skill,
activates each station. The Rabbit becomes a permanent companion.

## 10. Stage 9: Action and Object

### Learning outcome

The child reads an action together with the person or thing affected by it and
uses both parts to select the correct event.

### Content scope

- action plus article/determiner and object;
- action plus possessive and object;
- action plus a familiar descriptive object phrase; and
- short task phrases containing two to four words.

These remain phrases, not full sentences: there is no written subject and no
sentence-ending punctuation.

### Starter phrase bank

`find the book`, `open the door`, `close the box`, `see the moon`, `hear the
music`, `make a boat`, `draw a picture`, `read the story`, `write your name`,
`take my hand`, `carry the box`, `watch the birds`, `follow the road`, `hold the
ball`, `answer the questions`, `clean the room`, `build a house`, `plant the
seeds`, `touch the ground`, `choose a game`, `bring the map`, `move the table`,
`wash the table`, `cut the paper`, `check the box`, `check the answer`, `open
your book`, `help the child`, `find another way`, `show the picture`.

### Mission chapters

| Chapter | Learning work | Forest play |
| --- | --- | --- |
| Discover | Read distinct action-object combinations | Learn the Keeper's Workshop tools and tasks |
| Practice | Hold the object constant while changing the action, then reverse the contrast | Repair forest objects by selecting the exact task |
| Apply | Build and execute two- to four-word task phrases | Complete a written workshop task list |
| Prove | Follow unseen task phrases in a mixed scene | Repair five habitat items without autoplay |

### Semantic-control requirements

- Some choices use the same action with different objects: `open the door` and
  `open the box`.
- Some choices use different actions with the same object: `open the box` and
  `carry the box`.
- Later items vary a description or owner: `take my book` and `take your book`.
- No task should depend on fast dragging, precise aiming, or another unrelated
  motor skill.

### Common errors and responses

- **Acts from the verb only:** Hold the action constant and contrast objects.
- **Acts from the noun only:** Hold the object constant and contrast actions.
- **Drops small words:** Use possessive or determiner contrasts that visibly
  change the correct object.
- **Loses the phrase after audio:** Keep the text visible throughout the scene
  interaction.

### Capstone

Restore the Keeper's Workshop. The child receives a five-item written repair
list using fresh action-object phrases. Completing the correct tasks restores
animal habitats around the forest. The Beaver joins the player.

## 11. Stage 10: Location Phrases

### Learning outcome

The child reads a static location phrase and places or finds a person, animal,
or object according to the relationship expressed.

### Content scope

- `in`, `on`, and `under` relationships;
- `near`, `by`, `behind`, and `beside` relationships;
- `above`, `below`, and `between` relationships; and
- `inside` and `outside` relationships.

Movement phrases such as `into the house` or `across the water` remain reserved
for Stage 11.

### Starter phrase bank

`in the house`, `in the room`, `on the table`, `on the ground`, `under the
table`, `under the tree`, `near the water`, `near the house`, `by the road`, `by
the river`, `behind the door`, `behind the tree`, `beside the bed`, `beside the
wall`, `above the ground`, `above the door`, `below the surface`, `below the
window`, `between two people`, `between us`, `inside the box`, `inside
the room`, `outside the house`, `outside the school`, `at the door`, `at school`,
`around the table`, `within the circle`, `in front`, `at home`.

Production authoring should prefer phrases that clearly express a static
relationship. Ambiguous expressions such as `in front` need adequate scene
context or a fuller phrase before inclusion in independent checkpoints.

### Mission chapters

| Chapter | Learning work | Forest play |
| --- | --- | --- |
| Discover | Read and act on `in`, `on`, and `under` | Find animals hiding around the first grove shelter |
| Practice | Add `near`, `by`, `behind`, and `beside` | Place supplies and companions around the treehouse |
| Apply | Add `above`, `below`, `between`, `inside`, and `outside`; mix earlier phrases | Rebuild shelters from written placement clues |
| Prove | Interpret unseen location phrases in new scenes | Complete the Hidden Grove search without autoplay |

### Scene requirements

- Choice scenes reuse the same objects in different positions so the location
  word carries the answer.
- Camera angle and object overlap must make each relationship unambiguous.
- `Near`, `by`, and `beside` should not be used as contrast choices against each
  other until the content team defines a consistent child-facing distinction.
- Above/below and inside/outside receive direct mirrored contrasts.
- Static location remains visually distinct from movement into or out of a place.

### Common errors and responses

- **Uses the noun but ignores the relationship:** Keep all nouns identical and
  change only position.
- **Confuses `in` and `on`:** Use transparent or cutaway containers and surfaces
  before introducing more complex scenes.
- **Confuses static and movement meanings:** Do not mix Stage 11 movement phrases
  into current checkpoints.
- **Guesses from a companion's usual hiding place:** Randomize characters and
  locations while preserving semantic clarity.

### Capstone

Restore the Hidden Grove. Five animals are hidden in a new scene. The child reads
fresh location phrases to find each animal and then places supplies according to
two additional clues. Completing the search restores the treehouse, and the Owl
joins the player.

## 12. Spiral review across Stages 6-10

Every new stage continues earlier phrase relationships.

| Current stage | Earlier material intentionally reviewed |
| ---: | --- |
| 6 | Individual word recognition and optional word audio |
| 7 | Determiner, owner, and quantity groups from Stage 6 |
| 8 | Two-word grouping plus selected descriptions |
| 9 | Actions from Stage 8 and object groups from Stages 6-7 |
| 10 | Object groups, descriptions, and action-object tasks in static scenes |

Discover missions should be mostly current-stage content. By the Prove chapter,
roughly one third of items may review earlier phrase structures. This mix is a
starting point for playtesting, not a permanent formula.

Previously difficult phrases should return after other items have intervened.
Immediate repetition may be used for explanation, but it should not count as
independent evidence.

## 13. Content and accessibility requirements

- All Stage 6-10 production words must come from the existing 1,000-word list.
- Every phrase must be natural, meaningful, and appropriate for a child-facing
  context.
- Text remains visible while the child acts on its meaning.
- Phrase text supports browser zoom, large type, and responsive layout.
- Audio controls have text labels and do not rely on color alone.
- Drag interactions always have a tap or keyboard-accessible alternative.
- Animations respect reduced-motion settings.
- Instructions remain consistent across mission types.
- Illustrations show varied people, homes, activities, and environments without
  using personal characteristics as answer tricks.
- No stage uses weapons, injury, fear, or punishment as the main motivation.

## 14. Product capabilities required

### Content model

Phrase content needs stable identifiers and authored semantic metadata. A future
implementation design should support concepts equivalent to:

- stage and chapter;
- phrase text and ordered tokens;
- phrase pattern and semantic category;
- approved audio behavior;
- illustration or animation references;
- correct scene action and controlled distractors;
- whether an item is practice or reserved checkpoint content; and
- accessibility text.

### Progress model

Phrase progress should remain separate from the existing word-stage state and
record concepts equivalent to:

- completed mission identifiers;
- stage chapter and capstone completion;
- item-level meaning and construction results;
- phrase and word help usage;
- supported and independent encounters;
- scheduled review items;
- restored forest areas; and
- unlocked companions and Great Library pages.

Existing Word Academy progress, rewards, and field trips must be preserved.

### Reusable interface components

- PhraseCard
- PhraseAudioControl
- WordTileBuilder
- MeaningChoice
- ForestSceneController
- MissionFeedback
- ChapterMap
- StageCapstone
- CompanionRewardReveal
- PhraseProgressSummary

The component names are descriptive placeholders, not an implementation API.

## 15. Measurement plan

The first release should answer these questions:

1. Do children read both words, or answer from one familiar cue?
2. Can children transfer a learned phrase pattern to fresh word combinations?
3. Which interaction best reflects phrase understanding: matching, building, or
   scene control?
4. Does phrase-level audio help lead to later independent reading?
5. How many missions and separate sessions are needed before each stage feels
   secure rather than repetitive?
6. Do forest restoration and companions motivate rereading without distracting
   from the text?
7. Which phrase categories produce ambiguous illustrations or confusing
   distractors?

Useful internal signals include completion, fresh-item accuracy, construction
errors, semantic-choice errors, phrase and word help, reread support level, time
away between checkpoints, and voluntary revisits. These are product-learning
signals, not child-facing scores.

## 16. Delivery sequence

1. Finalize and editorially verify the Stage 6 phrase bank.
2. Implement the shared phrase content and progress foundations.
3. Build Stage 6 using all shared interaction types and validate it with children.
4. Adjust support, feedback, mission volume, and readiness behavior.
5. Add Stage 7 content and the attribute-changing scene behavior.
6. Add Stage 8 animation behavior with reduced-motion alternatives.
7. Add Stage 9 task-list and action-object contrasts.
8. Add Stage 10 placement scenes and the Hidden Grove capstone.
9. Validate cumulative review and the transition into Stage 11 movement phrases.

Stage 6 is the vertical slice. It should exercise the persistent content,
progress, help, checkpoint, forest-restoration, companion, and Great Library
systems needed by the rest of Phrase Forest.

## 17. Decisions fixed by this plan

- Stages 6-10 remain five distinct stages.
- Each stage contains 20 core missions plus adaptive review.
- Each stage uses four chapters and checkpoints across separate sessions.
- Checkpoint phrases are held out from guided practice.
- Stage 6-10 words come only from the existing 1,000-word foundation.
- Phrase understanding is demonstrated through meaning and construction, not
  speech-recognition or reading speed.
- Every stage permanently restores a forest area and unlocks one companion.
- Stage 10 teaches static location; movement and direction remain in Stage 11.
- Implementation begins with Stage 6 as the complete vertical slice.

Changes to these decisions should be recorded explicitly here and reconciled
with the parent master plan.
