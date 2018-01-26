/***
 * 加载文档到阅读区
 * @param $url
 * @param $id
 * @param $callback
 */
function loadDocument($url, $id, $callback) {
    $.ajax({
        url : $url,
        type : "GET",
        beforeSend : function (xhr) {
            var body = events.data('body_' + $id);
            var title = events.data('title_' + $id);
            var doc_title = events.data('doc_title_' + $id);
            var doc_info = events.data('doc_info_' + $id);

            // 获取缓存结果时增加对 doc_info 的判断
            if (body && title && doc_title && doc_info) {
                if (typeof $callback === "function") {
                    body = $callback(body);
                }

                $("#page-content").html(body);
                $("title").text(title);
                $("#article-title").text(doc_title);
                $("#article-info").text(doc_info);

                // events.trigger('article.open', { $url : $url, $init : false, $id : $id });
                events.trigger('article.open', { $url : $url, $id : $id });

                return false;
            }
            NProgress.start();
        },
        success : function (res) {
            if (res.errcode === 0) {
                var body = res.data.body;
                var doc_title = res.data.doc_title;
                var title = res.data.title;
                var doc_info = res.data.doc_info;

                $body = body;
                if (typeof $callback === "function" ) {
                    $body = $callback(body);
                }

                $("#page-content").html($body);
                $("title").text(title);
                $("#article-title").text(doc_title);
                $("#article-info").text(doc_info);

                events.data('body_' + $id, body);
                events.data('title_' + $id, title);
                events.data('doc_title_' + $id, doc_title);
                events.data('doc_info_' + $id, doc_info);

                // events.trigger('article.open', { $url : $url, $init : true, $id : $id });
                events.trigger('article.open', { $url : $url, $id : $id });
            } else if (res.errcode === 6000) {
                window.location.href = "/";
            } else {
                layer.msg("加载失败");
            }
        },
        complete : function () {
            NProgress.done();
        }
    });
}

function initHighlighting() {
    $('pre code').each(function (i, block) {
        hljs.highlightBlock(block);
    });

    hljs.initLineNumbersOnLoad();
}

var events = $("body");

$(function () {
    $(".view-backtop").on("click", function () {
        $('.manual-right').animate({ scrollTop: '0px' }, 200);
    });
    $(".manual-right").scroll(function () {
        var top = $(".manual-right").scrollTop();
        if (top > 100) {
            $(".view-backtop").addClass("active");
        } else {
            $(".view-backtop").removeClass("active");
        }
    });
    window.isFullScreen = false;

    initHighlighting();

    window.jsTree = $("#sidebar").jstree({
        'plugins' : ["wholerow", "types"],
        "types": {
            "default" : {
                "icon" : false  // 删除默认图标
            }
        },
        'core' : {
            'check_callback' : true,
            "multiple" : false,
            'animation' : 0
        }
    }).on('select_node.jstree', function (node, selected, event) {
        $(".m-manual").removeClass('manual-mobile-show-left');
        var url = selected.node.a_attr.href;

        if (url === window.location.href) {
            return false;
        }

        loadDocument(url, selected.node.id);
    });

    $("#slidebar").on("click", function () {
        $(".m-manual").addClass('manual-mobile-show-left');
    });
    $(".manual-mask").on("click", function () {
        $(".m-manual").removeClass('manual-mobile-show-left');
    });

    /**
     * 关闭侧边栏
     */
    $(".manual-fullscreen-switch").on("click", function () {
        isFullScreen = !isFullScreen;
        if (isFullScreen) {
            $(".m-manual").addClass('manual-fullscreen-active');
        } else {
            $(".m-manual").removeClass('manual-fullscreen-active');
        }
    });

    // 处理打开事件
    events.on('article.open', function (event, $param) {
        // 上一篇文档浏览记录
        var prevState = history.state || {};
        if ('pushState' in history) {
            /**
             * 原有逻辑，下次迭代删除
             * 首次加载的文档 pushState
             * 非首次次加载的文档 replaceState
             * 会造成浏览历史回退时遇到非首次加载的文档一直用相同的记录替换上一个浏览历史，无法回退
             */
            // if ($param.$init === false) {
            //     window.history.replaceState($param, $param.$id, $param.$url);
            // } else {
            //     window.history.pushState($param, $param.$id, $param.$url);
            // }

            /**
             * 修改后逻辑
             * 判定当前加载文档是否是上一篇文档
             * 如果是则忽略
             * 如果不是则记录浏览历史
             */
            prevState.$id === $param.$id || window.history.pushState($param, $param.$id, $param.$url);

        } else {
            window.location.hash = $param.$url;
        }

        initHighlighting();
        $(".manual-right").scrollTop(0);
    });

    $(".navg-item[data-mode]").on("click", function () {
        var mode = $(this).data('mode');
        $(this).siblings().removeClass('active').end().addClass('active');
        $(".m-manual").removeClass("manual-mode-view manual-mode-collect manual-mode-search").addClass("manual-mode-" + mode);
    });

    /**
     * 项目内搜索
     */
    $("#searchForm").ajaxForm({
        beforeSubmit : function () {
            var keyword = $.trim($("#searchForm").find("input[name='keyword']").val());
            if (keyword === "") {
                $(".search-empty").show();
                $("#searchList").html("");
                return false;
            }
            $("#btnSearch").attr("disabled", "disabled").find("i").removeClass("fa-search").addClass("loading");
            window.keyword = keyword;
        },
        success : function (res) {
            var html = "";
            if (res.errcode === 0) {
                for(var i in res.data) {
                    var item = res.data[i];
                    html += '<li><a href="javascript:;" title="' + item.doc_name + '" data-id="' + item.doc_id + '"> ' + item.doc_name + ' </a></li>';
                }
            }
            if (html !== "") {
                $(".search-empty").hide();
            } else {
                $(".search-empty").show();
            }
            $("#searchList").html(html);
        },
        complete : function () {
            $("#btnSearch").removeAttr("disabled").find("i").removeClass("loading").addClass("fa-search");
        }
    });

    window.onpopstate = function (e) {
        var $param = e.state;
        console.log($param);
        // 避免无浏览历史（$param 为 null）时出错的问题
        if ($param && $param.hasOwnProperty("$url")) {
            window.jsTree.jstree().deselect_all();

            window.jsTree.jstree().select_node({ id : $param.$id });
            // 此处对 $init 修改无效，暂且取消，下次迭代删除
            // $param.$init = false;
        } else {
            console.log($param);
        }
    };
    try {
        var $node = window.jsTree.jstree().get_selected();
        if (typeof $node === "object") {
            $node = window.jsTree.jstree().get_node({ id: $node[0] });
            // 为统一 history 记录 ID，用 $node.id 替换 $node.a_attr.id，
            events.trigger('article.open', { $url: $node.a_attr.href, $id: $node.id });
        }
    } catch (e) {
        console.log(e);
    }
});