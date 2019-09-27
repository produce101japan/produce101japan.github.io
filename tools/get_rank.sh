curl -s https://produce101.jp/rank/ | xmllint --html --xpath '//div[@class="box"]/div[@class="photo"]/a/@href' - 2>/dev/null | perl -pe 's/ /\n/g' | awk -F "\"" '{print $2}' | awk -F "=" '{print $2}' \
 | grep "_" | grep -n "" |awk -F ":" '{print $2 "," $1}' | sort
