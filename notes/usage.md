# Possible usage
1. get the svg file

2. process svg to gcode (remove comments, the parser seems to fail when it hits a comment)

3. put the gcode onto the device
```
     function uploadFileContent(file){
    readFileContent(file).then(content => {
      let filename = file.name;
      console.log(filename)
      putFile(filename, content);
    }).catch(error => console.log(error))
  }

  let i = 0;

  function putFile(filename, content) {
    log('Calling /rpc/FS.Put  ...', true);
    //check - need to see if the file exists already?!
    let chunks = content.match(/(?=[\s\S])(?:.*\n?){1,50}/g);
    i = 0;
    log('File uploading', true);
    putChunks(chunks[i], filename, false, chunks); 
  };

  function putChunks(chunk, filename, append, chunks){
      $.ajax({
      url: '/rpc/FS.Put',
      data: JSON.stringify({filename: `/mnt/${filename}`, append: append, data: btoa(chunk)}),
      type: 'POST',
      success: function(data) {
          append = true;
          $('.upload-progress').css('width', `${i/chunks.length*100}%`)
          if(i < chunks.length){
            i++;
            setTimeout(putChunks(chunks[i], filename, true, chunks), 100);
          }else{
            i = 0;
            log('File upload...success', true);
            setTimeout(getFileSystem(), 500);
          }
        }
      })
    }
```
4. RPC call to draw the file
```
// jot a file from the filesystem
$.ajax({
      url: '/rpc/SAM3XDL',
    data: JSON.stringify({file: 'filename.g'}),
      type: 'POST'
    })
```