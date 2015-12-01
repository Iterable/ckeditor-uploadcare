// Uploadcare CKeditor plugin
// Version: 2.1.1
CKEDITOR.addCss('.cke-resize{outline:none !important;}');
CKEDITOR.plugins.add('uploadcare', {
  hidpi: true,
  icons: 'uploadcare',
  init : function(editor) {
    var config = editor.config.uploadcare || {};

    // Check if Uploadcare is already loaded and load it if not.
    if (typeof uploadcare === 'undefined') {
        var version = config.widgetVersion || '2.5.5';
        var widget_url = 'https://ucarecdn.com/widget/' + version +
                 '/uploadcare/uploadcare.full.min.js'
        CKEDITOR.scriptLoader.load(widget_url);
    }

    // Apply default properties.
    if ( ! ('crop' in config)) {
      config.crop = '';
    }

    function searchSelectedElement(editor, needle) {
      var sel = editor.getSelection();
      var element = sel.getSelectedElement();
      if (element && element.is(needle)) {
        return element;
      }

      var widget;
      if (editor.widgets && (widget = editor.widgets.selected[0])) {
        if (widget.element.is(needle)) {
          return widget.element;
        }
      }

      var range = sel.getRanges()[0];
      if (range) {
        range.shrink(CKEDITOR.SHRINK_TEXT);
        return editor.elementPath(range.getCommonAncestor()).contains(needle, 1);
      }
    }

    editor.addCommand('showUploadcareDialog', {
      allowedContent: 'img[!src,alt]{width,height};a[!href]',
      requiredContent: 'img[src];a[href]',
      exec : function() {
        if (typeof uploadcare == 'undefined') {
          return; // not loaded yet
        }

        uploadcare.plugin(function(uc) {
          var settings, element, file;

          if (element = searchSelectedElement(editor, 'img')) {
            file = element.getAttribute('src');
          } else if (element = searchSelectedElement(editor, 'a')) {
            file = element.getAttribute('href');
          }

          if (file && uc.utils.splitCdnUrl(file)) {
            settings = uc.settings.build(
              uc.jQuery.extend({}, config, {multiple: false})
            );
            file = uploadcare.fileFrom('uploaded', file, settings);
          } else {
            settings = uc.settings.build(config)
            file = null;
          }

          var dialog = uploadcare.openDialog(file, settings).done(function(selected) {
            var files = settings.multiple ? selected.files() : [selected];
            uc.jQuery.when.apply(null, files).done(function() {
              uc.jQuery.each(arguments, function() {
                console.log("this is ....", this);
                origImg = this;
                var imageUrl = this.cdnUrl;
                if (this.isImage && ! this.cdnUrlModifiers) {
                  imageUrl += '-/preview/';
                };

                var successHandler = function(res) {
                  imageUrl = res.url
                    if (element) {
                      var widget;
                      if (editor.widgets && (widget = editor.widgets.selected[0]) && widget.element === element) {
                        widget.setData('src', imageUrl).setData('height', null)
                      } else if (element.getName() == 'img') {
                        element.data('cke-saved-src', imageUrl);
                        element.setAttribute('src', imageUrl);
                        editor.insertHtml(element.$.outerHTML, 'unfiltered_html');
                      } else {
                        element.data('cke-saved-href', origImg.cdnUrl);
                        element.setAttribute('href', origImg.cdnUrl);
                        editor.insertHtml(element.$.outerHTML, 'unfiltered_html');
                      }
                    } else {
                      if (origImg.isImage) {
                        editor.insertHtml('<img src="' + imageUrl + '" alt="" /><br>', 'unfiltered_html');
                      } else {
                        editor.insertHtml('<a href="' + origImg.cdnUrl + '">' + origImg.name + '</a> ', 'unfiltered_html');
                      }
                    };

                };

                // Make the request to the iterable endpoint for handling
                $.ajax({
                  url: '/images/uploadcare',
                  method: 'POST',
                  contentType: 'application/json;charset=utf-8',
                  dataType: 'json',
                  data: JSON.stringify({url: this.cdnUrl}),
                  success: successHandler
                });

              });
            });
          });
        });
      }
    });

    editor.ui.addButton && editor.ui.addButton('Uploadcare', {
      label : 'Upload Images',
      toolbar : 'insert',
      command : 'showUploadcareDialog'
    });
  }
});
