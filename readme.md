# dirtool  
file utility for finding doubles, merging dirs

# usage  
dirtool copy source-dir dest-dir [-ext=pdf,epub] [-name=substring] [-name-rx="regexp"] [-one-dir]
&nbsp; &nbsp; Copy with subdirectories and filter by extension

dirtool double dir [-R]  
&nbsp; &nbsp; Find doubles

dirtool empty dir [-R]  
&nbsp; &nbsp; Search empty subdirectories

dirtool extension dir [-sn|-sz]  
&nbsp; &nbsp; Statistics by file extensions

dirtool hidden dir [-R]  
&nbsp; &nbsp; Search hidden subdirectories

dirtool link dir [-F]  
&nbsp; &nbsp; Search broken symbolic links

dirtool merge source-dir dest-dir [-R]  
&nbsp; &nbsp; Delete files in source directory that exist in dest directory

dirtool same-name dir  
&nbsp; &nbsp; Search files with the same name but with different extension

dirtool search dir (substring|-rx=regexp)  
&nbsp; &nbsp; Search files with substring in name or with regexp



