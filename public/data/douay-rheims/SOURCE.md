# Scripture data source

The Scripture JSON files in this directory are derived from the **Original
Douay-Rheims Bible (1582–1610)** dataset maintained at
[janvier-s/original-douay-rheims](https://github.com/janvier-s/original-douay-rheims).

- Source commit: `0bf4218b9b46b5b00d29a703b5b74226051b97a5`
- Source path: `bible/raw/*.json`
- License: CC0 1.0 Universal; see [LICENSE.txt](./LICENSE.txt)
- Imported scope: the 73-book Catholic canon
- Excluded source works: 3 Esdras, 4 Esdras, and both Prayer of Manasses files
- Canon normalization: the source's Tobias chapter-zero title artifact is omitted;
  canonical chapters 1–14 are retained

The import keeps only each verse number and its plain-prose text, converting the
source arrays into `Record<chapter, Record<verse, text>>` JSON for the local
reader. Introductions, summaries, annotations, notes, and cross-references remain
available in the upstream repository but are not copied into this compact reader
format.
