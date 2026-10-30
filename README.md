# thumb-mosaic

キャラクターの公式イラストを、そのキャラクターを使った動画のサムネイルだけで組んだモザイクアートにして公開する。
サムネイルは 1 枚につき 1 回しか使わず、元の絵を薄く重ねたり、タイルの色を元の絵に寄せたりもしない。
離れて見ると普通の絵に見え、ズームすると一枚一枚が実在の動画のサムネイルだと分かる。
タイルを押すと、その動画の曲名と作者が出て、動画へ飛べる。

## 公開先

- キャラクターの一覧: <https://masseater.dev/mosaic/>
- 初音ミク: <https://masseater.dev/mosaic/miku>
- 重音テト: <https://masseater.dev/mosaic/teto>
- 足立レイ: <https://masseater.dev/mosaic/adachi>
- 琴葉茜・葵: <https://masseater.dev/mosaic/kotonoha>
- 結月ゆかり: <https://masseater.dev/mosaic/yukari>
- IA: <https://masseater.dev/mosaic/ia>
- 可不: <https://masseater.dev/mosaic/kafu>

各キャラクターの URL に `/credits` を付けると、使用したサムネイルの動画と作者の一覧を表示する。
画像は、キャラクターごとの Worker が各キャラクターの URL の配下で配信する。

- CI の実行時間の送信先: <https://thumb-mosaic-ci-telemetry.masseater.workers.dev>

CI の実行時間の送信先は、GitHub Actions の OIDC トークンがないリクエストに 401 を返す。

## 作り方

動画とサムネイルは [VocaDB](https://vocadb.net/) の楽曲一覧から集め、ニコニコ動画と YouTube のサムネイルを使う。
元の絵を `characters.json` の `cols` の列数のマスに分け、マスとサムネイルの色の違いの合計がもっとも小さくなるよう、全体を一度に割り当てる。
色は OKLab の色空間で、各マスを 4×3 の小区画に分けて比べる。
ほぼ同じサムネイルは、知覚ハッシュで 1 枚にまとめてから割り当てる。
割り当ては `characters.json` の `variants` の数だけ作り、2 通り目からは前の通りで使ったサムネイルほど選ばれにくくする。
各マスの候補は、それぞれの通りでそのマスに置いたサムネイルと、元の絵との色の差である。
読み込みのたびに色の差へ乱数の揺らぎを足し、差の小さい候補から同じサムネイルを二度使わないように割り当てる。
さらに読み込みのたびに、サムネイルの半分（`assign.ts` の `BAN_RATE`）をその回だけ使わない。
揺らぎの大きさは `TEMPERATURE` で決める。今の値では、色の差は最良の通りより 14% ほど増えるかわりに、開くたびに約 4 分の 3 のマスが入れ替わる。
そのため、開いた人はそれぞれ違うモザイクを見る。
開いたときの揺らぎの種は URL の `seed` に入るので、その URL を開けば同じモザイクになる。
クレジットの一覧も同じ `seed` から組み合わせを作り直して出す。

```sh
cd tools/mosaic
uv run mosaic pool miku    # VocaDB から曲とサムネイルを集める
uv run mosaic solve miku   # 割り当てを libs/mosaic/data/miku/<通りの番号>.json に書く
uv run mosaic site         # 画像を apps/web/public/files に書く
```

割り当てと画像はリポジトリに入れない。
CI のデプロイが毎回 VocaDB から前回より後に登録された曲を足して `pool`・`solve`・`site` を動かすので、VocaDB に動画が増えればモザイクの候補にも入る。
main への push のほかに毎日 1 回デプロイし、取ったサムネイルは Actions のキャッシュに残す。
割り当てが変わると、それまでの `seed` の URL は別のモザイクになる。
画像はすべて Worker の静的アセットで配り、アクセスが増えても配信に料金がかからないようにしている。
静的アセットはファイル数に上限があるので、原寸のサムネイルも縦横 4 枚ずつを 1 枚の画像にまとめる。

キャラクターは `libs/mosaic/src/characters.json` に足す。

## 画像の権利

ライセンスの MIT はこのリポジトリのコードだけに掛かる。
元のイラストとサムネイルの権利は、それぞれの作者と権利者にあり、リポジトリには入れていない。
初音ミクのイラストは KEI によるものである。
権利は © Crypton Future Media, INC. にあり、[piapro](https://piapro.net/) の条件で使っている。
重音テトのイラストは線によるもので、[重音テト公式サイト](https://kasaneteto.jp/illust-logo/)の配布素材を[キャラクター利用規約](https://kasaneteto.jp/guideline/character.html)の範囲で使っている。
足立レイの立ち絵はみさいるによるもので、[メカニカルガールの公式サイト](https://mechanicalgirl.jp/adachi-rei/)の配布素材を[キャラクター使用ガイドライン](https://mechanicalgirl.jp/guidelines)の範囲で使っている。
琴葉茜・葵は A.I.VOICE 琴葉 茜・葵の公式の立ち絵を 2 枚並べて元の絵にしている。権利は株式会社エーアイにある。
結月ゆかりのイラストは文倉十によるもので、VOCALOMAKETS のキャラクター使用ガイドラインの非商用の範囲で使っている。
IA のイラストは赤坂アカによるもので、権利は 1st PLACE 株式会社にある。[1st PLACE 二次創作ガイドライン](https://1stplace.co.jp/wp/wp-content/uploads/2021/11/Guideline.pdf)の、個人の非商用の範囲で使っている。
可不のイラストは PALOW. によるもので、権利は KAMITSUBAKI STUDIO にある。[KAMITSUBAKI STUDIO の二次創作ガイドライン](https://kamitsubaki.jp/guideline/)の、個人の非商用の範囲で使っている。
