if [ -z $1 ];
then
echo "video path is not set";
exit;
fi

if [ -z $2 ];
then 
echo "width is not set";
exit;
fi

if [ -z $3 ];
then 
echo "height is not set";
exit;
fi

for i in $1/*.jpg; do
     ffmpeg -i $i -vf "scale=$2:$3" $1/tmp.jpg;
     mv $1/tmp.jpg $i;
done
