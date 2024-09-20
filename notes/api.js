// list files from filesystem
$.ajax({
      url: '/rpc/FS.List',
      type: 'POST'
    })

// get file from filesystem
$.ajax({
      url: '/rpc/FS.Get',
      data: JSON.stringify({filename: '/api_shadow.js'}),
      type: 'POST',
    success: function(file) {
        console.log(atob(file.data))
      }
    })
// Send Gcode
$.ajax({
      url: '/rpc/GCode',
      data: JSON.stringify({gcode: 'M106 S150'}),
      type: 'POST'
    })
