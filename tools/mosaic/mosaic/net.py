import http.client
import sys
import time
import urllib.error
import urllib.request

USER_AGENT = "thumb-mosaic (+https://github.com/masseater/thumb-mosaic)"


def get(url: str, tries: int = 6, timeout: int = 120) -> bytes | None:
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return res.read()
        except urllib.error.HTTPError as e:
            if e.code in (403, 404, 410):
                return None
            print(f"retry {attempt + 1}/{tries} {url}: {e}", file=sys.stderr, flush=True)
        except (OSError, http.client.HTTPException) as e:
            print(f"retry {attempt + 1}/{tries} {url}: {e}", file=sys.stderr, flush=True)
        time.sleep(2**attempt)
    return None
