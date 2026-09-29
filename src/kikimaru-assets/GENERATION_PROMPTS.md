# 画像生成プロンプト

生成方式：組み込みの image_gen。参照：本会話で採用したききまるの立体風デザイン。

## 正面パーツ

```text
Use case: stylized-concept. Create a production 2D game CUTOUT PARTS ATLAS of the supplied mascot reference, Kikimaru. Preserve its distinctive FIVE rounded violet flower petals encircling cream face, single tea green leaf upper right, cream chubby body, dark dot eyes. Translate resin model into soft clean 2D illustration: subtle simple cel shading, crisp muted violet outlines, flat readable shapes, no fuzzy texture. This is NOT an illustration of the whole character and NOT an animation sheet. It contains exactly NINE SEPARATE detached component sprites on a genuinely TRANSPARENT alpha background, arranged in a strict equal 3 by 3 square grid, output square 1536x1536 if possible. Each invisible grid cell is 512x512. Center one component inside each cell with generous transparent padding; nothing crosses cell edges. No checkerboard drawn into image, no text, no guides, no full assembled character. ALL parts in this atlas are FRONT VIEW. Row1 col1: detached full five-petal flower HEAD including leaf and face, neutral gentle smile. Row1 col2: exact same head outline and size with delighted closed smiling eyes and open smile. Row1 col3: exact same head outline and size with surprised round eyes and small O mouth. All heads fit within central 420x420 area. Row2 col1: detached naked cream oval TORSO only, front view, NO head NO arms NO feet NO apron, simple complete rounded egg silhouette. Row2 col2: detached blank WHITE to light gray APRON ONLY, front view, broad rounded U-shaped bib with shoulder straps and open neck cutout, no body, NO green NO pocket NO badge: neutral grayscale because game tints this independently. Row2 col3: detached single cream short rounded ARM only, pointing downward, rounded shoulder suitable for pivot rotation, no fingers. Row3 col1: detached single cream short broad FOOT only, front view, flat sole and round top, suitable to mirror for pair. Row3 col2: detached cream rectangular TABLET BADGE only with muted violet four point sparkle symbol, to place over apron and preserve untinted cream badge. Row3 col3: single small golden four-point SPARKLE effect. Torso and apron have matching silhouette/proportions when scaled to fit. Uniform illustration style, no ground shadows, no environmental background. Truly transparent background is required. Reference is identity only, do not recreate its scenery or three view layout.
```

## 正面の胴体修正

```text
Edit the supplied 3x3 character parts atlas. Preserve absolutely every other component and exact placement. Fix ONLY the middle-left cell (row 2 column 1): the cream torso currently incorrectly includes two feet. Remove both attached feet and make this component ONE simple complete smooth rounded egg shaped cream torso, no limbs, no feet, no seam at bottom. This is a detachable torso for a cutout animation rig. Keep separate foot in bottom-left cell untouched. Preserve nine-cell composition. Also ensure background outside sprites is genuinely fully transparent, clean smooth alpha edges with no stray disconnected colored pixels. No other changes.
```

## 右向きパーツ

```text
Create a companion RIGHT-FACING cutout game parts atlas matching the supplied FRONT parts atlas exactly in character identity, lavender/cream/green colors, crisp soft 2D illustration style and stroke weight. The character is Kikimaru a FIVE rounded purple petal flower mascot with cream face and one green leaf. This atlas must face SCREEN RIGHT in a readable three-quarter view, face features shifted to right side and purple back of flower visible on left. Not front view. Output square on a genuinely transparent alpha background. Exactly nine isolated detached components in equal 3x3 grid with ample spacing, each occupying no more than central 80 percent of its cell; do not overlap or cross cell boundaries. No labels, no drawn grid, no backdrop, no full assembled character. Row1: three detached HEADS all with exactly same three-quarter-right outline and leaf position: first gentle smile/open eyes; second delighted eyes closed/smile; third surprised eyes/O mouth. Row2 col1: complete cream oval TORSO only angled slightly right, NO feet, NO arms, NO head, NO clothes, entirely smooth egg silhouette. Row2 col2: detached WHITE/light gray neutral grayscale APRON only with shoulder straps and neck cutout, slightly angled right to match torso, absolutely no badge no body, intended for color tint. Row2 col3: one detached cream rounded ARM only, slightly curving down, with round shoulder end for animation rotation. Row3 col1: one detached cream stubby FOOT pointing right, flat sole. Row3 col2: one detached cream rounded rectangular tablet BADGE angled slightly right, with a muted violet four-point sparkle emblem. Row3 col3: small simple cream dust puff effect for landing, clean bounded shape. Use matching gentle cel shading and softly colored crisp outlines. No shadows outside sprites, no floor. Preserve identity; this is a precise matching right-facing rig atlas, not a new character.
```

## 補助素材

```text
Create a cohesive soft illustrated 2D game PROP ATLAS to accompany the supplied Kikimaru character style. Genuinely transparent alpha background, square canvas, strict equal 3x3 grid. Exactly one isolated asset per cell, generous padding at least 15 percent cell edge on all sides, no object crosses cell, no text or lettering, no drawn grid, no backdrop. Gentle cel shading, warm cream and tea green with lavender outlines, readable mobile game pickup icons. Row1 col1: small cream teacup filled with green tea, no steam; row1 col2: bright orange mandarin fruit with one green leaf; row1 col3: red strawberry with green calyx. Row2 col1: one curved pink cooked shrimp, simplified friendly food icon; row2 col2: one blue-silver fish icon, friendly simple shape not realistic; row2 col3: purple round quiz medallion with a large white QUESTION MARK symbol only. Row3 col1: freestanding short wooden goal flagpole with a purple triangular flag and simple cream five-petal flower emblem, small flat base; row3 col2: smooth small gray rock obstacle, broad stable silhouette; row3 col3: cute grumpy small gray-purple dust-cloud creature with two dot eyes and stubby feet, simple obstacle enemy mascot. Objects all in same soft clean 2D illustrated aesthetic as reference, no heavy shadows outside sprites, no watercolor paper texture, no photographic or 3D rendering. These are proposed regional-themed collectible icons and game objects, not a map or official local symbols.
```

## 背景

```text
Use case: illustration-story. Asset type: static wide 2D mobile platform game background. Create a soft clean illustrated landscape inspired by central Shizuoka Japan, harmonious with a lavender flower mascot and tea-green brand. Wide landscape 1536x1024 or wider. Full opaque image, no transparency. Gentle clear pale blue sky filling upper half with a few small rounded white clouds; distant blue-green mountain ridges, green tea hills with neat curved bands in middle distance, winding blue river and a tiny peaceful local town, a few trees. Warm inviting daylight, refined soft cel-shaded 2D illustration, restrained detail, pastel low-contrast background so foreground characters and pickups read clearly. Lower quarter simple pale green open grass with minimal detail to permit separate gameplay platforms to be drawn over it. No characters, no enemies, no pickups, no text, no UI, no path suggesting a required route, no side-on floating platforms. No famous landmarks, no Fuji peak, not a factual map. This image is a scenic backdrop only, not a collision map and not promised seamless. Keep composition balanced and landscape elements distant and small. Clean professional family-friendly community business game aesthetic.
```


## v2 直線腕

組み込み画像生成機能で、正面パーツシートを参照し、クリーム色・紫褐色の輪郭を保った単一の直線カプセル形の腕を生成。肘の曲がり、くびれ、指は省き、上下に丸い端を持つアルファ透過PNGを指定。画像の範囲を切り出し、正面・右向きのarm.pngに共用。

## 横方向の反復用背景（2026-09-29）

生成・修正とも組み込み `image_gen` を使用。初稿は既存の `assets/backgrounds/tea_river.png` を画風・色合いの参照に指定。修正では初稿とその3枚連結画像を参照し、採用結果を `assets/backgrounds/tea_river_repeat_x.png` に保存。

### 初稿

```text
Use case: illustration-story.
Asset type: horizontally seamless repeating scenic backdrop tile for a 2D family-friendly game.
Input image 1: STYLE, PALETTE AND WORLD REFERENCE, the project's existing tea_river background. Create a new companion background; retain its soft clean painterly anime illustration, gently layered foliage, bright pale blue sky, blue-green distant mountain ridges, fresh yellow-green tea fields, small Japanese countryside houses and winding light-blue river. Not a photograph, not pixel art.
Output one opaque landscape PNG, 1536x1024 requested. Full bleed with no border, captions, panels or watermark.
CRITICAL: tile must repeat HORIZONTALLY when exact identical copies are placed edge-to-edge, no mirroring, no overlap. Treat horizontal coordinates as periodic. Right edge must continue directly into left edge with matching sky colors, cloud contours, ridge heights AND slopes, distant trees, tea-field rows and foreground grass texture. Design the wraparound seam intentionally; no visible vertical line or brightness shift. Top and bottom do NOT need to tile.
Composition similar to reference: open blue sky upper third; layered distant ridges and small tea-growing village across middle; gently winding river visible within middle scene and hidden behind hills before edges, not abruptly cut off; simple pale lime green open grass fills lower third, grass rear boundary is level. Keep perspective and scale consistent. At left/right boundary, mountain ridge at same height and smooth tangent, same middle-distance tea hills and connected shrub silhouettes, same level ground and light. Use an asymmetric, natural countryside composition rather than bilateral symmetry. Keep clouds entirely within tile if needed to avoid clipping; seamless sky gradient varying vertically only. No dark framing trees, no vignetting, no haze band at seam, no empty side margins.
Preserve inviting daylight, restrained soft contrast and details for foreground readability. No characters, props, game platforms, UI, text or famous landmarks. This is a fictional central-Shizuoka-inspired scenic backdrop, not a geographic map. Produce the SINGLE reusable seamless tile only; not a repeated preview.
```

### 空の継ぎ目の修正（採用画像）

```text
Edit image 1, the single horizontally repeating tea-river background tile. Image 2 is a DIAGNOSTIC ONLY: three identical tiles side by side exposing subtle vertical brightness seams in the blue sky at each tile join. Return ONLY ONE single 1536x1024 tile like image 1, not the diagnostic triptych.
TARGETED FIX: make the sky horizontally uniform in hue/lightness at corresponding heights, removing left-to-right illumination gradient and all vignetting. A gentle vertical sky gradient is fine, but color at x=0 must match color at x=1535 for each y. Keep clouds soft white and their existing design, ensure clouds meeting left/right boundary continue seamlessly.
Preserve the original image's countryside composition, river, bridge, houses, tea rows, trees, mountain ridge shapes, ground level and grass, and exact style and palette. Also improve exact continuity of tiny mountain/shrub/grass contours at the wrap boundary if needed. Tile right edge must continue into left edge, with no mirrored repetition and no blank or faded strip. Opaque PNG, no labels or guides. The goal is one horizontally seamless repeating background matching image 1 but without the visible SKY seam shown in image 2.
```

確認画像は PowerShell / System.Drawing で採用PNGを無加工・等倍で3枚並べ、連結境界の左右各384pxを切り出して作成。反転・補間・フェードによる継ぎ目の隠蔽は行っていません。採用PNG自体への後処理はありません。
