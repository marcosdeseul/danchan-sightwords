# Reading Game Master Plan

Status: Canonical product direction

Last updated: 2026-07-21

Scope: The complete progression from the existing 1,000 sight words to independent book reading

Current implementation: Word Academy remains intact, and the first playable
Phrase Forest release now covers Stages 6-10. Stages 11 onward remain the
canonical roadmap below.

## 1. North star

The game's long-term outcome is not completion of a word list. It is helping a
child become able and willing to read books independently and understand what
they read.

The progression is:

> Collect words -> connect phrases -> construct sentences -> navigate passages
> -> climb paragraphs -> live stories -> explore books.

Stages 1-5 remain the Word Academy and provide the existing 1,000-word
foundation. Starting with Stage 6, the curriculum becomes deliberately granular.
Phrases receive ten stages, sentences receive fifteen, and later connected-text
skills receive many stages of their own.

## 2. Product structure

| World | Stages | Primary reading unit | Player identity |
| --- | ---: | --- | --- |
| Word Academy | 1-5 | Individual words | Collector |
| Phrase Forest | 6-15 | Phrases | Pathfinder |
| Sentence City | 16-30 | Sentences | Builder |
| Passage River | 31-42 | Connected sentences and short passages | Navigator |
| Paragraph Mountain | 43-54 | Paragraphs | Climber |
| Story Kingdom | 55-66 | Multi-paragraph stories | Adventurer |
| Book Galaxy | 67-80 | Complete books | Explorer |
| Personal Library | 81+ | Self-selected reading | Reader and curator |

The stage numbers are durable curriculum identifiers. Themes and presentation
may evolve, but a later redesign should not silently combine several learning
stages into one.

## 3. Shared learning and game rules

1. The learning action is the game action. A child should not complete an
   unrelated minigame after reading; reading should repair, build, navigate,
   climb, or advance the world directly.
2. Meaning matters at every level. Even phrase practice should connect print to
   a picture, action, location, sequence, or idea.
3. Help is safe. Asking for pronunciation, highlighting, or another example
   never removes a life, breaks a streak, or takes away a reward.
4. Support fades. Content moves through Listen and Follow, Read with Help, and
   Read by Myself modes.
5. Rereading is progress. The game rewards returning to a text with less help,
   not reading faster than another child.
6. Adventure completion and durable mastery are separate. Finishing a capstone
   unlocks the next stage; short Daily Reading challenges collect mastery
   evidence on later days without stopping content progression.
7. Earlier skills remain in rotation. Each stage is mostly current-level work
   with deliberate review of earlier structures.
8. Speed is not a gate. Accuracy, meaning, persistence, and growing independence
   are the important signals.
9. The existing 1,000 words are the initial vocabulary foundation, not a
   permanent ceiling. Later stories and books may introduce a small number of
   clearly supported story words when natural language requires them.
10. Child-facing failure is gentle. Errors produce explanation and future
    practice, never shame or loss of collected items.

## 4. Standard anatomy of a reading stage

Stages 6-80 are expected to contain roughly 16-24 short missions spread over
multiple days. Exact volume should be tuned through playtesting rather than made
into a rigid time requirement.

Each stage has four chapters:

1. **Guided discovery:** narration, visual modeling, and direct examples.
2. **Supported practice:** optional word help and varied manipulation activities.
3. **Mixed application:** new structures mixed with earlier skills.
4. **Capstone:** unfamiliar examples with minimal default support that complete
   the stage adventure.

Each stage ends with a capstone that uses the current reading skill to change the
game world. Completing that capstone restores the area and unlocks the next
stage. Durable mastery is tracked separately through Daily Reading and should
include:

- successful reading-related interaction;
- evidence of understanding, such as a picture, route, order, or answer;
- reduced help across repeated encounters; and
- more than one successful memory challenge across separate reading days.

Daily Reading appears at the beginning of a later visit, lasts roughly 30-60
seconds, and is followed by available adventure content. A child should never
finish one review and encounter a wait screen.

No automatic child-speech score is required for the first implementation.
Optional caregiver confirmation may supplement in-app evidence.

## 5. Overarching story

After the Stage 5 final flight, the player discovers the Great Library. Its
books have lost the connections that create meaning. Each later world restores
one layer of reading:

- words restore objects;
- phrases restore connections;
- sentences restore places;
- passages restore journeys;
- paragraphs restore knowledge;
- stories restore characters and histories; and
- books restore entire worlds.

The same player character and previously earned equipment remain visible across
the journey. Every completed stage restores one page in the Great Library, while
each world also has its own local collectibles and game system.

---

## 6. World 1: Word Academy

### World gamification: collect and equip

This is the existing game loop: recognize words, manage known and practice
buckets, pass listening checks, find treasure, equip the character, complete
mazes, and finish field trips.

| Stage | Existing theme | Word scope | Learning role | World capstone |
| ---: | --- | ---: | --- | --- |
| 1 | Ancient Warrior | First 100 words | Establish the word-card, listening, known, and practice loop | Complete the Ancient Field Trip |
| 2 | Roman Warrior | Next 150 words | Extend automatic recognition while retaining Stage 1 words | Complete the Roman Road Field Trip |
| 3 | Medieval Knight | Next 200 words | Build a broader bank of common and content words | Complete the Castle Field Trip |
| 4 | Modern Soldier | Next 250 words | Sustain review across a larger vocabulary | Complete the Modern Field Trip |
| 5 | Jet Pilot | Final 300 words | Complete the existing 1,000-word foundation | Complete the final flight and discover the Great Library |

The existing progress and reward system remains canonical for Stages 1-5 unless
a later implementation plan explicitly changes it.

---

## 7. World 2: Phrase Forest

### World gamification: connect and grow

The forest has broken paths, sleeping plants, and animals unable to reach their
homes. Reading phrases reconnects the environment.

Core game actions:

- arrange word tiles to build bridges and paths;
- read location and direction phrases to guide companions;
- match meaningful phrases to pictures or actions;
- divide a long word line into natural phrase stepping stones; and
- reread phrases to grow plants and restore habitats.

World rewards include animal companions, seeds, unusual plants, treehouse rooms,
path decorations, and forest badges.

Detailed delivery plan:

- [Phrase Forest Stages 6-10](phrase-forest-stages-6-10-plan.md)

| Stage | Focus | Text progression | Signature play | Capstone |
| ---: | --- | --- | --- | --- |
| 6 | Two-word groups | `the dog`, `a house`, `my book`, `some water` | Pair tiles that naturally belong together | Build the first forest footbridge from unfamiliar two-word groups |
| 7 | Describing phrases | `red ball`, `little dog`, `long road`, `cold water` | Change an object or scene by selecting its describing word | Restore a color garden by reading description phrases |
| 8 | Action phrases | `can run`, `will go`, `came back`, `look down` | Make a companion perform the action that was read | Guide an animal through an action course |
| 9 | Action and object | `see the dog`, `find my book`, `open the door` | Combine an action tile with the correct object | Help a forest keeper complete a list of tasks |
| 10 | Location phrases | `in the house`, `under the table`, `near the water` | Place objects and companions in the location described | Find several hidden animals from written clues |
| 11 | Movement and direction | `down the road`, `into the room`, `across the water` | Choose and traverse the route described by a phrase | Lead a companion home through a branching trail |
| 12 | Time phrases | `in the morning`, `after school`, `at night`, `every day` | Arrange changing scenes and activities by time | Restore the forest's day-and-night clock |
| 13 | Expanded noun phrases | `the little red ball`, `a very old house` | Grow a basic object phrase by adding meaningful details | Identify the correct landmark from a detailed phrase |
| 14 | Expanded action phrases | `could not find`, `will come back`, `went down the road` | Keep a longer action group together while reading | Carry out a multi-step rescue using action phrases |
| 15 | Mixed phrase fluency | Mixed noun, action, location, direction, and time phrases | Mark natural phrase boundaries, then read the full line | Restore the Great Reading Tree by completing an independent phrase trail |

Stage 15 explicitly bridges phrases into sentences by showing chunks such as:

> The little dog / went into the house.

The child first reads the chunks and then reads the complete line.

---

## 8. World 3: Sentence City

### World gamification: construct and power

Sentence City is unfinished. Complete sentences construct buildings and bring
city systems to life.

The visual construction metaphor is consistent:

- the person or thing creates the foundation;
- the action powers the building;
- the object fills it;
- location places it on the city map; and
- time changes the city's clock, light, or weather.

Core game actions include building sentences from parts, expanding small
buildings with meaningful details, repairing signs, operating machines from
written instructions, and matching sentences to city events.

World rewards include buildings, citizens, vehicles, parks, decorations, and
new districts.

| Stage | Focus | Text progression | Signature play | Capstone |
| ---: | --- | --- | --- | --- |
| 16 | Who and action | `The dog ran.` `The girl smiled.` | Join a character to the action that completes a thought | Power the first home with unfamiliar who-action sentences |
| 17 | Action and object | `The boy found a ball.` | Add the affected object to complete the event | Stock a shop by reading who-did-what sentences |
| 18 | Being and having | `The water is cold.` `The dog has a ball.` | Match states and possessions to the right subject | Open the city museum by placing objects and descriptions correctly |
| 19 | Describing sentences | `The little bird is blue.` | Change visible details according to a complete sentence | Rebuild a neighborhood from descriptive sentences |
| 20 | Location sentences | `The cat is under the table.` | Place the full event or object in the described location | Complete the city map from location sentences |
| 21 | Movement sentences | `The boy went down the road.` | Move a character along the exact route described | Deliver packages through the city without picture-first prompting |
| 22 | Time sentences | `We went home after school.` | Change sequence, clock, or weather from the sentence | Schedule a full city day from written events |
| 23 | Ability and intention | `The bird can fly.` `We will make a boat.` | Separate what can happen from what will happen | Prepare a city project from ability and plan sentences |
| 24 | Negative sentences | `The dog cannot find the ball.` | Notice how `not`, `cannot`, and contractions change meaning | Repair warning signs by distinguishing positive and negative statements |
| 25 | Sentences with `and` | `The boy ran and jumped.` | Join actions, people, or objects without losing the main idea | Operate two-part city machines from joined sentences |
| 26 | Sentences with `but` and `so` | `It rained, so we went home.` | Show contrast or result by selecting the correct continuation | Restore city power by following contrast-and-result clues |
| 27 | Reasons and conditions | Sentences using `because`, `when`, and `if` | Connect an event to its reason, time, or condition | Complete an emergency plan from reason and condition sentences |
| 28 | Questions and answers | `Where is the red ball?` | Match question types to complete, relevant answers | Run the city information desk and answer written questions |
| 29 | Expression and punctuation | Statements, questions, exclamations, commands, and simple quotations | Use punctuation to select the intended voice and meaning | Direct a city performance by reading different sentence types |
| 30 | Independent sentence fluency | Mixed sentence structures with reduced assistance | Read, build, interpret, and repair unfamiliar sentences | Activate the central clock tower and complete Sentence City |

---

## 9. World 4: Passage River

### World gamification: navigate and connect

The player travels a large river. Individual sentences form sections of the
route, but their connections determine which way the expedition should go.

Core game actions include ordering sentence cards, resolving pronoun references,
choosing logical continuations, following written directions, removing unrelated
sentences, and selecting river branches from passage meaning.

World rewards include boat upgrades, map pieces, crew members, expedition flags,
patches, and discovered islands.

| Stage | Focus | Text progression | Signature play | Capstone |
| ---: | --- | --- | --- | --- |
| 31 | Same character or topic | Two sentences remain about one subject | Keep the correct character or object in the boat across both sentences | Navigate a two-stop route from paired sentences |
| 32 | Pronoun connections | `A bird was under the tree. It could not fly.` | Connect `he`, `she`, `it`, and `they` to the right earlier noun | Rescue the correct river companion from pronoun clues |
| 33 | Event sequence | Two or three ordered events | Arrange sentence cards into before-and-after order | Pass a set of river locks in the described sequence |
| 34 | Place continuity | Several sentences remain in or move between locations | Track where characters and objects are now | Follow a changing-location map without picture-first help |
| 35 | Cause and effect | One sentence causes or explains another | Choose the river change that logically follows | Avoid hazards by interpreting causes and results |
| 36 | Problem and solution | A simple problem is followed by possible actions and a solution | Select the solution supported by the passage | Repair the expedition boat from written clues |
| 37 | Question and explanation | A passage asks and then explains | Identify which sentence actually answers the question | Complete a river research station's question log |
| 38 | Comparison | Two people, objects, places, or animals | Sort what is the same and what is different | Choose equipment for two different islands from comparison passages |
| 39 | Dialogue connection | Short exchanges with clear speakers | Track who said what and why | Negotiate passage through a river village by reading dialogue |
| 40 | Three-sentence narrative | A compact beginning, event, and outcome | Keep a scene coherent across three sentences | Navigate a narrative river bend independently |
| 41 | Informational passage | Three to five related factual sentences | Collect facts and use them for a practical choice | Complete an island field guide from informational passages |
| 42 | Mixed passage mastery | Narrative and informational passages with reduced support | Navigate, order, connect, and explain unfamiliar passages | Finish a multi-stop expedition and restore the River Atlas |

---

## 10. World 5: Paragraph Mountain

### World gamification: climb and organize

A paragraph becomes a mountain. The central idea is the summit, supporting
details are climbing steps, sequence determines the route, and irrelevant
details lead away from the trail.

Core game actions include choosing a central route, attaching supporting details,
ordering events, gathering supplies from informational text, inferring conditions
from clues, and summarizing text to unlock camps.

World rewards include camp equipment, climbing patches, mountain companions,
panorama pieces, journals, and summit flags.

| Stage | Focus | Text progression | Signature play | Capstone |
| ---: | --- | --- | --- | --- |
| 43 | What makes a paragraph | Four related sentences presented first separately and then as a block | Group sentences that belong together | Establish the first base camp by assembling one coherent paragraph |
| 44 | Central or topic sentence | A clear sentence introduces the paragraph's main subject | Choose the trail sign that best names the whole paragraph | Select a route from the paragraph's central sentence |
| 45 | Supporting details | Details explain, describe, or prove the main point | Attach useful supply packs and reject unrelated ones | Build a complete camp from one central idea and its details |
| 46 | Sequence paragraph | Four to six events or steps in order | Arrange climbing steps according to the text | Follow a complete ascent procedure independently |
| 47 | Descriptive paragraph | Multiple details create one person, place, animal, or object | Reconstruct a mountain scene from written details | Identify an unseen landmark from its paragraph description |
| 48 | Cause-and-effect paragraph | Several connected causes and results | Trace how one mountain event changes another | Predict and prepare for changing mountain conditions |
| 49 | Problem-and-solution paragraph | A problem develops before a supported solution | Evaluate which tool or action fits the written problem | Complete a rescue based on a full paragraph |
| 50 | Compare-and-contrast paragraph | Similarities and differences appear across a paragraph | Place details on two sides of a mountain map | Choose routes for two climbers with different needs |
| 51 | Cohesion and reference | Pronouns, repeated ideas, and connecting words tie the paragraph together | Follow reference ropes back to earlier ideas | Cross a foggy route by resolving references without illustrations |
| 52 | Vocabulary from context | A supported unfamiliar word appears within a familiar paragraph | Infer meaning from examples, contrast, description, or outcome | Decode the meaning of expedition journal terms from context |
| 53 | Simple inference | The answer is supported but not stated directly | Combine two or more clues to choose the safe conclusion | Prepare for an unstated condition using textual evidence |
| 54 | Main idea and summary | Mixed five- to eight-sentence narrative and informational paragraphs | Choose and produce a concise retelling | Reach the summit by reading and summarizing unfamiliar paragraphs |

---

## 11. World 6: Story Kingdom

### World gamification: complete quests and restore stories

Each story is a playable quest. Reading reveals the character, setting, goal,
problem, events, and resolution. Choices test understanding of the written story
rather than arbitrarily replacing it.

Core game actions include discovering character goals, locating described
settings, predicting supported events, repairing missing pages, ordering plot
scenes, and retelling with collected scene cards.

World rewards include playable characters, kingdom locations, character homes,
story illustrations, scene cards, and completed volumes for the castle library.

| Stage | Focus | Text progression | Signature play | Capstone |
| ---: | --- | --- | --- | --- |
| 55 | Character | Short stories centered on one clearly described character | Choose actions and belongings that fit the character | Complete a character quest using evidence from the story |
| 56 | Setting | Stories establish where and when events occur | Rebuild the setting from textual details | Find the correct kingdom location without picture-first prompting |
| 57 | Goal and motivation | A character wants or needs something | Identify the goal that drives later events | Help a character prepare for the goal stated in the text |
| 58 | Story problem | The goal encounters an obstacle | Distinguish the main problem from incidental events | Open the correct quest path by explaining the problem |
| 59 | Event sequence | Several events develop the problem | Arrange collected scene cards in story order | Cross the kingdom by following a complete event chain |
| 60 | Resolution and ending | Actions lead to a supported solution and outcome | Choose why the ending resolves or fails to resolve the problem | Restore a village by completing a problem-solution story |
| 61 | Prediction from evidence | Pauses occur before likely next events | Choose a prediction and identify the clue supporting it | Anticipate a quest event from earlier details |
| 62 | Dialogue in stories | Speakers, quotations, feelings, and intentions | Track speakers and connect dialogue to action | Complete a council scene by reading dialogue accurately |
| 63 | Beginning, middle, and end | A full story is organized into three broad parts | Sort and retell scenes by narrative role | Restore a three-panel story mural |
| 64 | Two-paragraph stories | Paragraph breaks separate related moments or purposes | Carry characters and goals across the break | Complete a two-part quest with reduced support |
| 65 | Multi-page stories | Several paragraphs unfold across page turns | Remember earlier clues, settings, and events | Recover missing pages and finish a longer story |
| 66 | Independent story and retelling | Mixed narrative structures with minimal default support | Read, answer, sequence, and retell | Restore the castle library with an independently completed story |

---

## 12. World 7: Book Galaxy

### World gamification: explore and discover

Every book is a planet. Pages are locations, chapters are regions, and related
books form constellations. Reading advances the spacecraft; understanding the
text reveals what is on the planet.

Core game actions include exploring pages, remembering information across page
turns, following characters across chapters, collecting earlier clues, revisiting
books with reduced support, and completing narrative and informational missions.

World rewards include planets, spacecraft customization, alien companions,
constellations, cover badges, and Great Library shelves.

Books may earn three noncompetitive achievements:

- **Understanding Star:** demonstrated comprehension;
- **Rereading Star:** returned to the book; and
- **Independent Star:** completed it with minimal assistance.

No achievement depends on reading speed.

| Stage | Focus | Book progression | Signature play | Capstone |
| ---: | --- | --- | --- | --- |
| 67 | Repeating-pattern books | Predictable language repeats with one meaningful change | Use the pattern to anticipate and verify the next page | Complete a pattern planet without automatic narration |
| 68 | One sentence per page | Each page carries one complete event or fact | Connect page text to its illustration and the prior page | Finish a short one-sentence-per-page book |
| 69 | Two connected sentences per page | Pronouns and details connect within each page | Track meaning between the paired sentences | Explore a six-page planet with optional help only |
| 70 | Three- to four-sentence pages | Each page functions like a short passage | Find the page's central event or fact | Complete a longer-page book and page-level questions |
| 71 | Simple narrative books | Character, setting, problem, events, and solution span the book | Collect plot clues across pages | Finish and retell a complete narrative book |
| 72 | Simple informational books | A topic develops through organized facts | Build a planet field guide from facts across pages | Explain the book's main topic and key details |
| 73 | Dialogue books | Dialogue drives character action across pages | Track speakers, intentions, and consequences | Complete a character mission built around dialogue |
| 74 | Problem-and-solution books | The central problem develops through several attempts | Compare attempts and identify the final solution | Resolve a book-length mission from evidence |
| 75 | Sequence and procedural books | Steps, cycles, journeys, or historical sequences span pages | Build or navigate something in the written order | Complete a procedure without returning to picture-first directions |
| 76 | One paragraph per page | Pages contain sustained blocks rather than isolated lines | Summarize each page before moving on | Complete a paragraph-per-page planet log |
| 77 | Several paragraphs per book section | Paragraphs serve different purposes within a section | Connect central ideas and details across paragraph breaks | Finish a complex informational or narrative mission |
| 78 | Short chapter books | Several named chapters form one complete book | Remember goals, facts, and unresolved events across session breaks | Complete a multi-session chapter-book planet |
| 79 | Reduced illustration support | Text supplies details previously carried by pictures | Construct scenes and predictions primarily from words | Explore a mostly textual planet independently |
| 80 | Graduation book | A complete original book mixes all prior skills | Read, revisit evidence, answer, summarize, and retell | Restore the Great Library and receive Independent Reader status |

---

## 13. World 8: Personal Library

### World gamification: collect, choose, and share

Stage 81 onward is intentionally open-ended rather than a final finite campaign.
The child curates a library and develops an identity as a reader.

Core activities:

- choose books by interest and appropriate challenge;
- complete themed and genre collections;
- reread favorites with less assistance;
- follow original book series;
- build and decorate a personal library;
- record physical books read with a caregiver;
- recommend a book to a family member; and
- create a simple cover, scene, character card, or retelling.

Physical books are logged honestly rather than presented as app-assessed. A
caregiver can record Read Together, Read with Help, or Read Independently and
optionally add the child's favorite part.

The Personal Library should use expandable reading bands instead of permanent
stage numbers for every title:

1. supported picture books;
2. independent picture books;
3. early readers;
4. transitional readers;
5. short chapter books;
6. longer chapter books; and
7. informational and interest-led collections.

Reading-day celebrations are gentle and cumulative. Missing a day never resets
or removes a streak, collection, or decoration.

## 14. Features introduced by world

The curriculum is large, but engineering should introduce only one major game
system at a time.

| World | Major new product system |
| --- | --- |
| Word Academy | Existing word cards, speech, checks, rewards, maze, and field trip |
| Phrase Forest | Phrase tiles, phrase chunking, and path interactions |
| Sentence City | Sentence construction, expansion, punctuation, and scene matching |
| Passage River | Sentence cards, ordering, cross-sentence references, and branching navigation |
| Paragraph Mountain | Paragraph presentation, evidence selection, main-idea and detail organization |
| Story Kingdom | Story-state tracking, scene cards, plot structure, and retelling |
| Book Galaxy | Page and chapter reader, persistent book state, rereading achievements, and Bookshelf |
| Personal Library | Choice, collections, physical-book logging, recommendations, and reader-created responses |

## 15. Progress model direction

Word progress remains separate from connected-reading progress. The eventual
data model should distinguish completion from independence and should retain
specific help needs without punishing the child.

Conceptually, reading progress needs to record:

- current world and stage;
- completed mission and capstone identifiers;
- separate adventure-completion and durable-mastery status;
- Reading Stars and the reading days on which they were earned;
- a cross-stage Daily Reading review queue;
- comprehension-check results;
- words or structures that frequently needed help;
- whether narration, highlighting, or tap help was used;
- supported and independent rereads;
- completed stories and books; and
- personal-library collections.

Exact fields belong in an implementation design and migration plan. Existing
users must retain all word, reward, stage, and field-trip progress.

## 16. Content authoring rules

1. Author and review child-facing text deliberately; do not generate production
   passages at runtime without editorial control.
2. Use the existing 1,000 words as the initial base vocabulary.
3. Introduce only a small, intentional number of supported story words when
   richer natural text requires them.
4. Maintain cumulative control over phrase and sentence structures, not merely
   word frequency.
5. Use both narrative and informational content.
6. Represent varied children, families, places, interests, and experiences.
7. Prefer exploration, creation, humor, care, discovery, and problem-solving as
   recurring motivations.
8. Questions must measure meaning rather than visual test-taking tricks.
9. Illustrations support understanding but should not make reading unnecessary.
10. Capstones introduce held-out text. Later memory challenges use an expanded
    held-out bank or a meaningfully changed activity or scene, rather than an
    immediate repeat of the preceding mission.

## 17. Implementation sequence

The full curriculum is the product direction, not a requirement for one release.
Build it world by world:

1. Preserve and stabilize Word Academy.
2. Build the reusable reading-content and progress foundation.
3. Implement Phrase Forest and validate its ten-stage learning loop.
4. Extend the same foundation into Sentence City.
5. Add cross-sentence state and build Passage River.
6. Add paragraph and evidence interactions for Paragraph Mountain.
7. Add narrative state, scene cards, and retelling for Story Kingdom.
8. Add the book reader, chapter persistence, and Bookshelf for Book Galaxy.
9. Open the Personal Library after the graduation experience is validated.

Each world should be tested with children before the next world fixes assumptions
about reading difficulty, assistance, mission length, and reward cadence into the
product.

## 18. Durable decisions

The following decisions define this master plan:

- Stages 1-5 are the existing 1,000-word foundation.
- Phrase learning is not one stage; it spans Stages 6-15.
- Sentence learning is not one stage; it spans Stages 16-30.
- Passages, paragraphs, stories, and books each receive their own extended world.
- Every world has a distinct gamification system tied to its reading skill.
- Children carry one identity and their collected history across all worlds.
- Help is nonpunitive, support fades, and rereading is rewarded.
- Understanding and independence matter more than speed.
- Book reading leads to an open-ended library rather than a terminal end screen.

Changes to these decisions should be made explicitly in this document so the
curriculum does not drift across implementation conversations.
