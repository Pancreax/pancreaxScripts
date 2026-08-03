filename=$(basename "$1" .gp)
temp_dir=$(mktemp -d -t gp)
unzip "$1" -d "$temp_dir/$filename"
target_file="$temp_dir/$filename/Content/score.gpif"
xmllint --format "$target_file" --huge --output "$target_file"
code "$target_file"