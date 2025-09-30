#!/bin/bash

# set your GitHub repo details
USER="sameer-khan-a"
REPO="images"
BRANCH="main"

# clear the output file first
> cdn_links.txt

# loop through all files in current directory
for f in *; do
  if [ -f "$f" ] && [ "$f" != "generate_links.sh" ] && [ "$f" != "cdn_links.txt" ]; then
    # URL-encode spaces into %20
    fname=$(echo "$f" | sed 's/ /%20/g')
    echo "https://cdn.jsdelivr.net/gh/$USER/$REPO@$BRANCH/$fname" >> cdn_links.txt
  fi
done
