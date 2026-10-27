const INTRO_MS = 2100;

const SHADER = `
struct Frame {
  camera: vec4f,
  viewport: vec4f,
  grid: vec4f,
};

struct Draw {
  span: vec4f,
  color: vec4f,
  params: vec4f,
};

struct Out {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) local: vec2f,
  @location(2) alpha: f32,
};

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var linear_sampler: sampler;
@group(0) @binding(2) var<storage, read> cells: array<u32>;
@group(1) @binding(0) var<uniform> draw: Draw;
@group(1) @binding(1) var source: texture_2d<f32>;

fn corner_of(index: u32) -> vec2f {
  var corners = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
  );
  return corners[index];
}

fn to_clip(pixel: vec2f) -> vec4f {
  let ndc = pixel / frame.viewport.xy * 2.0 - 1.0;
  return vec4f(ndc.x, -ndc.y, 0.0, 1.0);
}

fn cell_pixels() -> vec2f {
  return frame.grid.zw * frame.camera.x;
}

fn grid_to_pixel(grid: vec2f) -> vec2f {
  return frame.camera.yz + grid * cell_pixels();
}

fn hash(seed: u32) -> u32 {
  let mixed = seed * 747796405u + 2891336453u;
  let word = ((mixed >> ((mixed >> 28u) + 4u)) ^ mixed) * 277803737u;
  return (word >> 22u) ^ word;
}

fn random(seed: u32) -> f32 {
  return f32(hash(seed)) / 4294967296.0;
}

@vertex
fn vs_quad(@builtin(vertex_index) index: u32) -> Out {
  let corner = corner_of(index);
  let grid = draw.span.xy + corner * draw.span.zw;
  var result: Out;
  result.position = to_clip(grid_to_pixel(grid));
  result.uv = corner;
  result.local = corner * draw.span.zw * cell_pixels();
  result.alpha = draw.params.z;
  return result;
}

@vertex
fn vs_intro(@builtin(vertex_index) index: u32, @builtin(instance_index) tile: u32) -> Out {
  let corner = corner_of(index);
  let cols = u32(frame.grid.x);
  let cell = vec2f(f32(cells[tile] % cols), f32(cells[tile] / cols));
  let stretch = vec2f(1.0, frame.grid.w / frame.grid.z);
  let middle = frame.grid.xy * 0.5;
  let spread = length((cell - middle) * stretch) / length(middle * stretch);
  let angle = random(tile * 3u) * 6.2831853;
  let reach = frame.viewport.w * (0.8 + random(tile * 3u + 1u) * 0.6);
  let delay = random(tile * 3u + 2u) * 700.0 + spread * 400.0;
  let progress = clamp((frame.viewport.z - delay) / 1000.0, 0.0, 1.0);
  let remaining = pow(1.0 - progress, 4.0);
  let center = grid_to_pixel(cell + 0.5) + vec2f(cos(angle), sin(angle)) * reach * remaining;
  var result: Out;
  result.position = to_clip(center + (corner - 0.5) * cell_pixels() * (1.0 + remaining * 2.5));
  result.uv = (cell + corner - draw.span.xy) / draw.span.zw;
  result.local = vec2f(0.0);
  result.alpha = min(1.0, progress * 3.0);
  return result;
}

@fragment
fn fs_image(input: Out) -> @location(0) vec4f {
  return textureSample(source, linear_sampler, input.uv) * input.alpha;
}

@fragment
fn fs_outline(input: Out) -> @location(0) vec4f {
  let size = draw.span.zw * cell_pixels();
  let edge = min(min(input.local.x, input.local.y), min(size.x - input.local.x, size.y - input.local.y));
  if (edge > draw.params.y) {
    discard;
  }
  return draw.color;
}
`;

export { INTRO_MS, SHADER };
