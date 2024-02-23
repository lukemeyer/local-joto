// get file from filesystem
$.ajax({
      url: '/rpc/FS.Get',
      data: JSON.stringify({filename: '/api_shadow.js'}),
      type: 'POST',
    success: function(file) {
        console.log(atob(file.data))
      }
    })
