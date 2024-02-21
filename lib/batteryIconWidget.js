'use strict';
const {Clutter, GObject, St} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {VectorImages} = Me.imports.lib.vectorImages;

// Credits: to https://github.com/Deminder for this https://github.com/Deminder/battery-indicator-icon/blob/main/src/modules/drawicon.js

function addVectorImage(cr, w, path)  {
    cr.translate(0, 0);
    const sw = (w / 1000) * 3.75; // Dont know why is this 3.75, Got it by trial and error, need to figure out what the actual calculation is and why it is not target width / original width
    const sh = sw;
    cr.scale(sw, sh);
    const vectorImagePath = Clutter.Path.new_with_description(path);
    const drawPathNode = {
        [Clutter.PathNodeType.CLOSE]: () => cr.closePath(),
        [Clutter.PathNodeType.CURVE_TO]: points =>
            cr.curveTo(...points.slice(0, 6)),
        [Clutter.PathNodeType.LINE_TO]: points =>
            cr.lineTo(...points.slice(0, 2)),
        [Clutter.PathNodeType.MOVE_TO]: points =>
            cr.moveTo(...points.slice(0, 2)),
    };
    vectorImagePath.foreach(node =>
        drawPathNode[node.type](node.points.flatMap(p => [p.x, p.y]))
    );
}

var BatteryIcon = GObject.registerClass(
class BatteryIcon extends St.DrawingArea {
    _init(modelIconSize, modelPathName, {style_class}) {
        super._init({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            style_class,
        });
        this.width = modelIconSize;
        this.height = modelIconSize;
        this._modelPathName = modelPathName;
    }

    updateValues(percentage, charging) {
        this._charging = charging;
        this._percentage = percentage;
        this.queue_repaint();
    }

    _circle(cr, style) {
        const {w, h, p, foregroundColor, chargingColor, disconnectedColor, strokeWidth} = style;
        const size = h;
        const radius = (size - strokeWidth) / 2;
        const [cw, ch] = [w / 2, h / 2];
        const bColor = foregroundColor.copy();
        bColor.alpha *= 0.3;

        cr.save();
        Clutter.cairo_set_source_color(cr, bColor);
        cr.setLineWidth(strokeWidth);
        cr.translate(cw, ch);
        cr.scale(w / size, h / size);
        cr.arc(0, 0, radius, 0, 2 * Math.PI);
        cr.stroke();

        Clutter.cairo_set_source_color(cr, chargingColor);
        const angleOffset = -0.5 * Math.PI;
        cr.arc(0, 0, radius, angleOffset, angleOffset + p * 2 * Math.PI);
        cr.stroke();
        cr.restore();

        const modelPath = VectorImages[this._modelPathName];
        const chargingPath = VectorImages['charging-bolt'];
        const disconnectedPath = VectorImages['disconnected'];

        Clutter.cairo_set_source_color(cr, foregroundColor);
        addVectorImage(cr, w, modelPath);
        cr.fill();

        if (this._percentage === -1) {
            cr.restore();
            Clutter.cairo_set_source_color(cr, disconnectedColor);
            addVectorImage(cr, w, disconnectedPath);
            cr.fill();
        } else if (this._charging) {
            cr.restore();
            Clutter.cairo_set_source_color(cr, foregroundColor);
            addVectorImage(cr, w, chargingPath);
            cr.fill();
        }
    }

    get iconColors() {
        return this.get_theme_node().get_icon_colors();
    }

    vfunc_repaint() {
        const iconColors = this.iconColors;
        const foregroundColor = iconColors.foreground;
        const chargingColor = this._percentage > 10 || this._charging ? iconColors.success : iconColors.warning;
        const disconnectedColor = iconColors.error;
        const cr = this.get_context();
        const [w, h] = this.get_surface_size();
        const one = h / 16;
        const strokeWidth = 1.8 * one;
        const p = this._percentage <= 0 ? 0 : this._percentage / 100;
        const style = {w, h, p, foregroundColor, chargingColor, disconnectedColor, strokeWidth};
        this._circle(cr, style);
        cr.$dispose();
    }
}
);


