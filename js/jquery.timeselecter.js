;
(function (root, factory) {
    if (typeof define === 'function') {
        if (define.amd) {
            define(['../../src/resource/lib/jquery'], factory);
        }
        else if (define.cmd) {
            define(function (require, exports, module) {
                module.exports = factory(require('jquery'))
            })
        }
    }
    else if (typeof exports === 'object') {
        module.exports = factory(require('jquery'));
    }
    else {
        factory(root.jQuery);
    }
}(this, function ($) {
    var weekmap = ['一', '二', '三', '四', '五', '六', '日'];
    var tpl = buildTpl();
//所有实例共享同一套模版
    function buildTpl() {
        var tpl = [
            '<div class="timeselector-box">',
            '<div class="timeselector-box-hd"></div>',
            '<div class="timeselector-box-bd">',
            '<div class="timeselector-table-top">',
            ' <div class="slash-header">',
            '   <div class="time-title">时间</div>',
            '   <div class="slash-header-line"></div>',
            '   <div class="week-title">星期</div>',
            ' </div>',
            '{{timetitleTpl}}',
            '</div>',
            '<div class="timeselector-table-side">',
            '{{weektitleTpl}}',
            '</div>',
            '<table class="timeselector-table-main">',
            ' <tbody>{{trTpl}}</tbody>',
            '</table>',
            '<div class="timeselector-table-mask"></div>',
            '</div>',
            '<div class="timeselector-box-ft">',
            '<div class="handle-group">',
            ' <button class="box-handle-btn" data-function="selectweek">工作日</button>',
            ' <button class="box-handle-btn" data-function="selectweekend">周末</button>',
            ' <button class="box-handle-btn" data-function="selectall">全选</button>',
            ' <button class="box-handle-btn" data-function="selectopp">反选</button>',
            ' <button class="box-handle-btn" data-function="clear">清空</button>',
            '</div>',
            '<div class="timeselector-result">',
            '<p class="title">已选中时间段</p>',
            '</div>',
            '</div>',
            '</div>'
        ].join('');
        var trTpl = '',
            timetitleTpl = '',
            weektitleTpl = '',
            i;
        //表格格子
        for (i = 0; i < 7; i++) {
            trTpl += '<tr>';
            for (var j = 0; j < 24; j++) {
                trTpl += '<td class="week' + i + '   time' + j + '"></td>'
            }
            trTpl += '</tr>';
        }
        //时间表头
        for (i = 0; i < 24; i++) {
            timetitleTpl += '<div class="time-col">' + i + '</div>';
        }
        //星期表头
        for (i = 0; i < 7; i++) {
            weektitleTpl += '<div class="week-row">星期' + weekmap[i] + '</div>';
        }
        //使用字符串替换的方法生成新的模版字符串，避免了dom遍历，提高性能
        tpl = tpl.replace('{{trTpl}}', trTpl)
            .replace('{{timetitleTpl}}', timetitleTpl)
            .replace('{{weektitleTpl}}', weektitleTpl);
        return tpl;

    }

    /*
     * 语义化得到结果数组的内部方法
     * @param  [1,2,3,4,6,7,8]
     * return: [[1,4],[6,8]]
     * */
    function _semanticsGetResultArr(arr) {
        var resultArr = [],
            currentArr = [];
        resultArr = [[arr[0], arr[0]]];
        currentArr = resultArr[resultArr.length - 1];
        var i = 1,
            length = arr.length;
        for (; i < length; i++) {
            if (parseInt(currentArr[1]) + 1 == arr[i]) {
                currentArr[1] = arr[i];
            }
            else {
                resultArr.push([arr[i], arr[i]]);
                currentArr = resultArr[resultArr.length - 1];
            }
        }
        return resultArr;
    }

    /**
     * 时间数据语义化
     * @param
     *{
            0: [1, 2, 3, 8],
            6: [1, 2, 3, 4, 5]
        }
     * @return
     * 星期日:1:00-3:00 8:00
     * 星期六：1:00-5:00
     */
    function semantics(json) {
        var time,
            str;
        return $.map(json, function (item, index) {
            str = '<p>星期' + weekmap[index - 1 < 0 ? 6 : index - 1] + ':';

            time = $.map(_semanticsGetResultArr(item), function (item) {
                return item[0] + ':00' + (item[0] == item[1] ? ' ' : '-' + item[1] + ':00  ');
            }).join('');

            str += time + '</p>';

            return str;
        }).join('');
    }

    /*
     * 区域选择
     *  @param  [row1,col1,row2,col2]   [3,5,8,7]
     *  @return
     *  '.row*.col*'
     * */
    function _selectWrapper(row1, col1, row2, col2) {
        var selector = '';
        for (var i = Math.min(row1, row2), length1 = Math.max(row1, row2); i <= length1; i++) {
            for (var j = Math.min(col1, col2), length2 = Math.max(col1, col2); j <= length2; j++) {
                selector += '.week' + i + '.time' + j + ',';
            }
        }
        return selector.substring(0, selector.length - 1);
    }

    /*
     * 获取格子位置
     * @param    'week1  time1'
     * @return {week:1,time:1}
     * */
    function getPosition(str) {
        return {
            week: str.match(/week(\d)/)[1],
            time: str.match(/time(\d*)/)[1]
        }
    }

    var Timeselecter = function (container, options) {
        this.$container = $(container);
        this.options = options;
        this.init();
    };
    Timeselecter.prototype = {
        init: function () {
            this.$container.append(tpl);
            this.$timetable = this.$container.find('.timeselector-table-main');
            this.$showTextArea = this.$container.find('.timeselector-result');
            this.$allTds = this.$timetable.find('td');
            this.$allTrs = this.$timetable.find('tr');
            this.set(this.options.initData); //初始化数据
            this.$showTextArea.html(semantics(this.options.initData));//初始化数据语义化展示
            this.bind();
        },
        bind: function () {
            //绑定事件
            var that = this;
            this.$container.on('click', '.handle-group button', function () {
                var functionName = $(this).attr('data-function');
                if ($.isFunction(that[functionName])) {
                    that[functionName]();
                }
            });
            //shift事件
            this.shiftSelect();
            //滑选事件
            this.moveSelect();
        },
        /*
         * 通过键值对对象设置表格的选中
         * @param    {0:[1,2,3]}
         * */
        set: function (json) {
            var that = this,
                selector = '';
            $.each(json, function (week, timeArr) {
                $.each(timeArr, function (index, time) {
                    selector += '.week' + week - 1 < 0 ? 6 : week - 1 + '.time' + time + ',';
                });
            });
            this.$timetable.find(selector.substring(0, selector.length - 1)).addClass('active');
        },
        /*
         * 遍历表格获取结果数组
         * return：{0:[1,2,3]
         * */
        get: function () {
            var that = this,
                result = {};
            this.$allTds.each(function () {
                var $td = $(this);
                if ($td.hasClass('active')) {
                    var className = $td.attr('class');
                    var week = parseInt(getPosition(className)['week']),
                        time = getPosition(className)['time'];
                    week = ((week + 1) == 7) ? 0 : week + 1;
                    if (!(week in result)) {
                        result[week] = [];
                    }
                    result[week].push(time);
                }
            });
            return result;
        },
        change: function () {
            //语义化数据并展示
            this.$showTextArea.html(semantics(this.get()));
            this.options.change();
        },
        shiftSelect: function () {
            //按住shift键选中
            var that = this,
                $startTd,
                $endTd;
            this.$timetable.on('click', 'td', function (ev) {
                if (!ev.shiftKey) {
                    $(this).toggleClass('active');
                    $startTd = $(this);
                } else {
                    $endTd = $(this);
                    var selector = _selectWrapper(
                        getPosition($startTd.attr('class'))['week'],
                        getPosition($startTd.attr('class'))['time'],
                        getPosition($endTd.attr('class'))['week'],
                        getPosition($endTd.attr('class'))['time']
                    );
                    that.$timetable.find(selector).addClass('active');
                }
                that.change();
            });
        },
        moveSelect: function () {
            //滑选事件
            var that = this,
                isMouseDown = false,
                isMoveing = false,
                $startTd,
                $endTd;
            var $selectLayer = this.$container.find('.timeselector-table-mask');
            that.$container
                .on('mousedown', 'td', function (ev) {
                    isMouseDown = true;
                    $startTd = $(this);
                })
                .on('mousemove', 'td', function (ev) {
                    if (!isMouseDown)return;
                    isMoveing = true;
                    $endTd = $(ev.target);
                    var width = $endTd.position().left - $startTd.position().left,
                        height = $endTd.position().top - $startTd.position().top;
                    $selectLayer.css({
                        width: Math.abs(width) + $endTd[0].offsetWidth,
                        height: Math.abs(height) + $endTd[0].offsetHeight,
                        top: (height > 0 ? $startTd : $endTd).position().top - 1,
                        left: (width > 0 ? $startTd : $endTd).position().left - 1,
                        visibility: 'visible'
                    });
                });
            $(document).on('mouseup', function () {
                var selector, row1, row2, col1, col2;
                if (isMouseDown) {
                    isMouseDown = false;
                    if (!isMoveing)return;
                    isMoveing = false;
                    $selectLayer.css({visibility: 'hidden'});
                    row1 = getPosition($startTd.attr('class'))['week'];
                    col1 = getPosition($startTd.attr('class'))['time'];
                    row2 = getPosition($endTd.attr('class'))['week'];
                    col2 = getPosition($endTd.attr('class'))['time'];
                    selector = _selectWrapper(row1, col1, row2, col2);
                    that.$timetable.find(selector).addClass('active');
                }
                that.change();
            });
        },
        selectall: function () {
            //全选
            this.$allTds.addClass('active');
            this.change();
        },
        selectopp: function () {
            //反选
            this.$allTds.toggleClass('active');
            this.change();
        },
        clear: function () {
            //重置
            this.$allTds.removeClass('active');
            this.change();
        },
        selectweek: function () {
            this.clear();
            $([].slice.call(this.$allTrs, 0, 5)).children().addClass('active');
            this.change();
        },
        selectweekend: function () {
            this.clear();
            $([].slice.call(this.$allTrs, 5)).children().addClass('active');
            this.change();
        }
    };
    $.fn.timeselecter = function () {
        var _timeselecter = this.data('timeselecter');
        if (!_timeselecter) {
            var option = arguments[0],
                options = $.extend({}, $.fn.timeselecter.defaults, option);
            _timeselecter = new Timeselecter(this[0], options);
            this.data('timeselecter', _timeselecter);
        }
        return _timeselecter;
    };
    $.fn.timeselecter.defaults = {
        defaultData: [],//默认数据
        change: $.noop,//change回调
    }
}));