
local function starts_with(str, start)
   return str:sub(1, #start) == start
end
if (starts_with(get_window_name(), "stream")) then
    set_window_geometry(316, 404, 352, 242);
    undecorate_window();
    set_on_top();
end
