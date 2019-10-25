while read line
do
 trainee=`echo $line | awk -F "," '{print $1}'`
 current=`echo $line | awk -F "," '{print $5}'`
 rank=`curl -s https://produce101.jp/profile/data.php?id=${trainee} | sed -n ${1}p`
 if [ "$rank" == "NULL" ]; then
   echo $line 
 else
   echo $line,$rank | awk -F "," '{print $1","$2","$3","$4","$6}'
 fi
done < ../trainee_info.csv

