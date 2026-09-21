# Research

Tier 2 (outside users; reading-comfort claims need evidence, not taste). Three research passes on separate topics: typography and layout, color, and existing reading products. About 70 searches and 60 pages. Stopped by saturation per topic. Checked 2026-09-17.

Where studies disagree or don't exist, the row says so. Values that rest on practice rather than studies are marked "practice".

## Facts

### Typography and layout

| ID | Fact | Source | Primary | Published | Checked |
|---|---|---|---|---|---|
| V-1 | Readability and comprehension improved as font size rose to 18–22pt; no further gain above 22pt (104 readers, eye tracking; 1024×768 17" monitor, so pt ≠ modern px). | [Rello, Pielot, Marcos — Make It Big!](https://pielot.org/pubs/Rello2016-Fontsize.pdf) | yes | 2016 | 2026-09-17 |
| V-2 | Reading speed collapses below a critical print size of ~0.2° x-height; fluent from 0.2° to 2°. 18px on a phone at 35cm and 20px on a desktop at 60cm are just above it (our estimate). | [Legge & Bigelow, J. Vision](https://jov.arvojournals.org/article.aspx?articleid=2191906) | yes | 2011 | 2026-09-17 |
| V-3 | 55 characters per line gave better comprehension than 100; long lines are sometimes read faster, but readers prefer moderate lengths. Evidence is mixed. | [Dyson & Haselgrove 2001](https://dl.acm.org/doi/10.1006/ijhc.2001.0458); [Dyson 2004 review](https://stu.westga.edu/~ssynan1/literacy/Dyson.pdf) | yes | 2001, 2004 | 2026-09-17 |
| V-4 | Practice: 45–75 characters, 66 ideal (Bringhurst); 45–90 and 15–25px (Butterick); WCAG 1.4.8 (AAA) ≤ 80 characters, not justified, line spacing ≥ 1.5. | [webtypography.net](http://webtypography.net/2.1.2); [Practical Typography](https://practicaltypography.com/summary-of-key-rules.html); [WCAG 1.4.8](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html) | yes | — | 2026-09-17 |
| V-5 | Layout must survive line-height 1.5, paragraph spacing 2×, letter spacing 0.12em, word spacing 0.16em (AA). | [WCAG 1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) | yes | — | 2026-09-17 |
| V-6 | Serif vs sans makes little or no measurable difference on screen; the fastest font differs per reader (up to 35% faster) and preference does not predict speed. So: offer a small choice. | [Arditi & Cho 2005](https://www.sciencedirect.com/science/article/pii/S0042698905003007); [Bernard et al. 2002](https://researchinuserexperience.wordpress.com/2002/01/10/a-comparison-of-popular-online-fonts-which-size-and-type-is-best/); [Wallace et al. TOCHI 2022](https://jeffhuang.com/papers/Readability_TOCHI22.pdf) | yes | 2002–2022 | 2026-09-17 |
| V-7 | Literata was designed for Google Play Books; variable with an optical-size axis (7–72). | [9to5Google](https://9to5google.com/2015/05/18/google-play-books-default-font-replace-droid-serif/); google/fonts METADATA | yes | 2015 | 2026-09-17 |
| V-8 | Practice: light text on dark looks heavier (irradiation); reduce weight or grade in dark mode. No controlled reading study found. | [CSS-Tricks](https://css-tricks.com/dark-mode-and-variable-fonts/) | no | 2020 | 2026-09-17 |
| V-9 | Adults read non-fiction silently at ~238 wpm (190 studies, 18,573 readers). | [Brysbaert 2019](https://www.sciencedirect.com/science/article/abs/pii/S0749596X19300786) | yes | 2019 | 2026-09-17 |
| V-10 | Firefox Reader View defaults: 20px, 30em column, line-height 1.6. Substack: 19px (17px ≤ 768px), 1.6. Safari Reader: 16–20px side padding on phones. | [Firefox source](https://github.com/mozilla-firefox/firefox/blob/main/toolkit/components/reader/AboutReader.sys.mjs); Substack live CSS; [Safari Reader copy](https://github.com/dm-zharov/safari-readability/blob/main/Reader.html) | yes / no | current | 2026-09-17 |
| V-11 | Practice (BDA): 16–19px, left-aligned, 60–70 characters, headings ≥ 20% larger than body. | [BDA Dyslexia Style Guide](https://www.bumc.bu.edu/jmedday/files/2025/05/Dyslexia-Style-Guide-2023-BDA-Style-Guide-2023.pdf) | yes | 2023 | 2026-09-17 |

### Color

| ID | Fact | Source | Primary | Published | Checked |
|---|---|---|---|---|---|
| V-20 | Dark-on-light text gives better proofreading than light-on-dark; the advantage comes from display luminance, not polarity itself, and is largest at small text sizes. | [Buchner & Baumgartner 2007](https://www.tandfonline.com/doi/abs/10.1080/00140130701306413); [Buchner, Mayr & Brandt 2009](https://pubmed.ncbi.nlm.nih.gov/19562598/); [Piepenbrock et al. 2014](https://journals.sagepub.com/doi/abs/10.1177/0018720813515509) | yes | 2007–2014 | 2026-09-17 |
| V-21 | Reading speed is flat across a wide contrast range: 10× less contrast slowed reading by less than 2× for normal vision. Above ~7:1, more contrast buys little. | [Legge, Rubin & Luebker 1987](https://experts.umn.edu/en/publications/psychophysics-of-reading-v-the-role-of-contrast-in-normal-vision/) | yes | 1987 | 2026-09-17 |
| V-22 | Light text on dark was worst in a dark room at small sizes (glance reading, ages 20–65). | [Dobres et al. 2017](https://jdobr.es/pdf/Dobres-etal-2017-Ambient.pdf) | yes | 2017 | 2026-09-17 |
| V-23 | Halation in dark mode for people with astigmatism: plausible mechanism, no controlled study found. APCA's author reports halation complaints at very high dark-mode contrast. | [Level Access](https://www.levelaccess.com/blog/accessibility-for-people-with-astigmatism/); [APCA discussion](https://github.com/Myndex/SAPC-APCA/discussions/74) | no | — | 2026-09-17 |
| V-24 | Material dark theme uses #121212 surfaces and 87% white text, not pure black/white. Safari Reader night: #121212 with #B0B0B0. | [Material Design](https://m2.material.io/design/color/dark-theme.html); Safari Reader.html (macOS 27) | yes | ~2019 / 2026 | 2026-09-17 |
| V-25 | Blue-light-filtering lenses probably make no difference to eye strain (17 RCTs). Eye strain comes from reduced blinking (18→4 per minute on screens), distance and lack of breaks. So sepia is a comfort preference, not a health feature. | [Cochrane 2023](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD013244.pub2/full); [AAO](https://www.aao.org/eye-health/tips-prevention/should-you-be-worried-about-blue-light); [Sheppard & Wolffsohn 2018](https://www.bynocs.com/wp-content/uploads/2023/10/Digital-eye-strain-prevalence-measurement-and-amelioration.pdf) | yes | 2018–2023 | 2026-09-17 |
| V-26 | WCAG: 4.5:1 AA, 7:1 AAA, no maximum. Links must not rely on color alone (1.4.1). | [WCAG 1.4.6](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html); [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) | yes | — | 2026-09-17 |
| V-27 | Reader-mode palettes in use span 7.5:1 to 18:1 (Firefox sepia #F4ECD8/#5B4636 7.5:1; Safari sepia #F8F1E3/#4F321C 10.4:1; Firefox dark #1C1B22/#FBFBFE 16.5:1). | [Firefox aboutReader.css](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/toolkit/themes/shared/aboutReader.css); Safari Reader.html | yes | 2026 | 2026-09-17 |

### Reading products

| ID | Fact | Source | Primary | Published | Checked |
|---|---|---|---|---|---|
| V-40 | Bionic Reading gave no speed or comprehension benefit (Readwise, 1,916 readers; eye-tracking RSOS study, 90 readers, most preferred plain text). No controlled evidence for paragraph dimming. | [Readwise](https://blog.readwise.io/bionic-reading-results/); [RSOS summary](https://scienceblog.com/s-bionic-reading-bolds-the-first-half-of-each-word-on-the-promise-of-more-efficient-reading-and-a-registered-eye-tracking-study-of-90-skilled-adult-readers-found-the-bolding-moved-their-first/) | yes / no | 2022, 2026 | 2026-09-17 |
| V-41 | Hide-on-scroll-down headers work, but a header that reappears on every small upward scroll distracts people who scroll back to reread. | [NN/g sticky headers](https://www.nngroup.com/articles/sticky-headers/) | yes | — | 2026-09-17 |
| V-42 | Readers complain about too few typography controls (Safari, old Firefox, Kindle margins), steps that are too coarse (Kindle 2025 spacing), and interfaces with too much (Readwise onboarding). | [The eBook Reader](https://blog.the-ebook-reader.com/2025/06/19/kindles-have-new-spacing-settings-after-last-update-video/); [Firefox 129 notes](https://www.firefox.com/en-US/firefox/129.0/releasenotes/); [HN Readwise launch](https://news.ycombinator.com/item?id=34006202) | mixed | 2022–2025 | 2026-09-17 |
| V-43 | "Time left" is liked by some and found anxious or inaccurate by others: it must be possible to turn it off. | [Goodreads forum](https://www.goodreads.com/topic/show/1906767-kindle-app-reading-time-feature) | no | — | 2026-09-17 |
| V-44 | Common reader-mode failures: blank or one-paragraph output, missing images, JS-only pages, paywalls, bot blocking. Wanted fallbacks: open the original, pick/paste the content. | [HN](https://news.ycombinator.com/item?id=28286493); [NetNewsWire help](https://netnewswire.com/help/mac/5.1/en/reader-view.html) | mixed | 2021–2023 | 2026-09-17 |
| V-45 | Controls placed over the text (Apple Books iOS 16) drew strong complaints; hiding them once reading starts was the fix. | [MacRumors forums](https://forums.macrumors.com/threads/i-truly-despise-the-ios-16-apple-books-update.2372905/) | no | 2022 | 2026-09-17 |
| V-46 | @mozilla/readability is maintained (Firefox uses it), needs a DOM in Node and does not sanitize output. Postlight/Mercury parser is unmaintained since 2023. Defuddle is newer and very active but self-described as work in progress. | [readability](https://github.com/mozilla/readability); [postlight/parser](https://github.com/postlight/parser); [defuddle](https://github.com/kepano/defuddle) | yes | 2026 | 2026-09-17 |
| V-47 | Pocket shut down July 2025 and Omnivore in November 2024; users lost saved data. A no-account, nothing-stored tool avoids that risk. | [Wikipedia: Pocket](https://en.wikipedia.org/wiki/Pocket_(service)); [TechCrunch](https://techcrunch.com/2024/10/29/elevenlabs-has-hired-the-team-behind-omnivore-a-reader-app/) | mixed | 2024–2025 | 2026-09-17 |

### Books, documents and local storage (checked 2026-09-17)

| ID | Fact | Source | Primary | Published | Checked |
|---|---|---|---|---|---|
| V-60 | epub.js 0.3.93 last published 2023, iframe renderer; foliate-js has no npm release and calls itself not stable; fflate 0.8.3 (2026-07) gives a ~30 KB tree-shakable unzip. | [epub.js](https://github.com/futurepress/epub.js); [foliate-js](https://github.com/johnfactotum/foliate-js); [fflate](https://github.com/101arrowz/fflate) | yes | 2023–2026 | 2026-09-17 |
| V-61 | Vercel functions reject request bodies over 4.5 MB. | [Vercel limits](https://vercel.com/docs/functions/limitations) | yes | current | 2026-09-17 |
| V-62 | EPUB DRM markers: META-INF/rights.xml (Adobe ADEPT), sinf.xml (Apple FairPlay), license.lcpl (Readium LCP); encryption.xml with only IDPF/Adobe font-obfuscation algorithms is not DRM. | [EPUB OCF 3.3](https://www.w3.org/TR/epub-33/#sec-container-metainf); foliate-js epub.js source | yes | 2023 | 2026-09-17 |
| V-63 | mammoth 1.12.3 (2026-09) converts DOCX headings, lists, tables, footnotes and images to semantic HTML. | [mammoth](https://github.com/mwilliamson/mammoth.js) | yes | 2026 | 2026-09-17 |
| V-64 | pdfjs-dist 6.3.289 (2026-08): getTextContent gives positioned runs, not paragraphs; getOutline gives the bookmark tree or null; Turbopack ignores pdf.js's webpackIgnore worker import. | [pdf.js](https://github.com/mozilla/pdf.js); [next.js#65406](https://github.com/vercel/next.js/issues/65406) | yes | 2026 | 2026-09-17 |
| V-65 | IndexedDB quota is ~60% of disk per origin (Chrome, Safari 17+); Safari deletes script-written storage after 7 days without a visit unless the site is a Home Screen app; navigator.storage.persist() is supported in Chrome, Firefox and Safari 17+. | [MDN quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria); [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) | yes | 2023–2026 | 2026-09-17 |
| V-66 | Modal dialogs interrupt the task and cost context; NN/g reserves them for critical or essential steps and advises against them for nonessential information. Resuming a read is optional, so a non-modal card fits. | [NN/g modal vs nonmodal](https://www.nngroup.com/articles/modal-nonmodal-dialog/) | yes | — | 2026-09-21 |
| V-67 | Kindle's "Go to furthest page read" prompt is the model most readers know; complaints are that it repeats on every open and that the mark can't be cleared from the device (only on Amazon's site). | [How-To Geek](https://www.howtogeek.com/359117/how-to-clear-your-furthest-read-page-on-kindle/); [KBoards](https://www.kboards.com/threads/question-about-sync-to-furthest-page-read.23613/) | mixed | — | 2026-09-21 |
| V-68 | Motion started by an interaction should be possible to turn off; `prefers-reduced-motion` is the signal (WCAG 2.3.3, AAA). | [W3C Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | yes | — | 2026-09-21 |

## Alternatives

| Name | Used for | Gap for our users' job | Status | Facts |
|---|---|---|---|---|
| Safari Reader / Firefox Reader View / Chrome reading mode | One-click reader in the browser | Browser-specific; few controls (Safari), side panel (Chrome); nothing to share | active | V-10, V-42 |
| Readwise Reader, Instapaper, Matter | Read-later libraries | Need an account; library features the one-off reader doesn't need | active | V-42, V-47 |
| Pocket, Omnivore, Mercury Reader | Read-later / extraction | Shut down | closed 2023–2025 | V-46, V-47 |
| Kindle, Apple Books, Kobo | Books | Not for web articles | active | V-42, V-43, V-45 |

## Not researched

- Justified text with hyphenation as an option: WCAG 1.4.8 and the BDA advise against justification; nothing in the first release depends on it.
- Letter- and word-spacing controls: no proven benefit for typical readers (WCAG 1.4.12 only requires the layout to survive them, which em-based CSS does).
- Kobo, Instapaper, Readwise and Medium theme colors: not published; fan copies were not used.
