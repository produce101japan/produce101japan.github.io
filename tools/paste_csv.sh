paste ../trainee_info.csv <(sh get_rank.sh | awk -F "," '{print $2}') | awk -F "\t" '{print $1 "," $2}' | awk -F "," '{print $1 "," $2 "," $3 ",f," $6}'
