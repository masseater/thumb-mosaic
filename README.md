# thumb-mosaic

キャラクターの公式イラストを、そのキャラクターを使った動画のサムネイルだけで組んだモザイクアートにして公開する。
サムネイルは 1 枚につき 1 回しか使わず、元の絵を薄く重ねたり、タイルの色を元の絵に寄せたりもしない。
離れて見ると普通の絵に見え、ズームすると一枚一枚が実在の動画のサムネイルだと分かる。
タイルを押すと、その動画の曲名と作者が出て、動画へ飛べる。

## 公開先

- 初音ミク: <https://masseater.dev/mosaic/miku>

## 作り方

動画とサムネイルは [VocaDB](https://vocadb.net/) の楽曲一覧から集め、ニコニコ動画と YouTube のサムネイルを使う。
元の絵を 80 列のマスに分け、マスとサムネイルの色の違いの合計がもっとも小さくなるよう、全体を一度に割り当てる。
色は OKLab の色空間で、各マスを 4×3 の小区画に分けて比べる。
ほぼ同じサムネイルは、知覚ハッシュで 1 枚にまとめてから割り当てる。

```sh
cd tools/mosaic
uv run mosaic pool miku    # VocaDB から曲とサムネイルを集める
uv run mosaic solve miku   # 割り当てを libs/mosaic/data/miku.json に書く
uv run mosaic site         # サムネイルを取り、apps/web/public/files に書き出す
```

リポジトリに入るのは割り当ての結果だけで、画像は入れない。
main の CI がデプロイの前に `site` を動かし、取ったサムネイルを Actions のキャッシュに残す。

キャラクターは `libs/mosaic/src/characters.json` に足す。

## 画像の権利

ライセンスの MIT はこのリポジトリのコードだけに掛かる。
元のイラストとサムネイルの権利は、それぞれの作者と権利者にあり、リポジトリには入れていない。
初音ミクのイラストは KEI によるものである。
権利は © Crypton Future Media, INC. にあり、[piapro](https://piapro.net/) の条件で使っている。
