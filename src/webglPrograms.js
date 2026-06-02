export function createProgram(glContext, vertexSource, fragmentSource) {
  const vertex = compileShader(glContext, glContext.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(glContext, glContext.FRAGMENT_SHADER, fragmentSource);
  const program = glContext.createProgram();
  glContext.attachShader(program, vertex);
  glContext.attachShader(program, fragment);
  glContext.linkProgram(program);

  if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
    throw new Error(glContext.getProgramInfoLog(program));
  }

  return {
    program,
    attributes: collectLocations(glContext, program, glContext.ACTIVE_ATTRIBUTES, glContext.getActiveAttrib, glContext.getAttribLocation),
    uniforms: collectLocations(glContext, program, glContext.ACTIVE_UNIFORMS, glContext.getActiveUniform, glContext.getUniformLocation),
  };
}

function compileShader(glContext, type, source) {
  const shader = glContext.createShader(type);
  glContext.shaderSource(shader, source);
  glContext.compileShader(shader);

  if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
    throw new Error(glContext.getShaderInfoLog(shader));
  }

  return shader;
}

function collectLocations(glContext, program, countName, activeGetter, locationGetter) {
  const locations = {};
  const count = glContext.getProgramParameter(program, countName);

  for (let i = 0; i < count; i += 1) {
    const info = activeGetter.call(glContext, program, i);
    const name = info.name.replace(/\[0\]$/, '');
    locations[name] = locationGetter.call(glContext, program, name);
  }

  return locations;
}
